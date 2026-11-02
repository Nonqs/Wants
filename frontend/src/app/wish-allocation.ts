// UI simulation of Item.Score/calculateTimeScore/depositMoney. No Go changes.
export interface AllocationWish {
  price: number;
  saved: number;
  necessity: number;
  utility: number;
  desire: number;
  wish: boolean;
  status?: 'active' | 'purchased' | 'archived';
  startDate: number; // Unix seconds, as in the CLI.
}

export function timeScore(days: number): number {
  return days < 7 ? 0 : days < 30 ? 1 : days < 90 ? 2 : 4;
}

// Integer score in hundredths, preserving the CLI's exact weights.
export function wishWeight(w: AllocationWish, now: number): number {
  if ((w.status && w.status !== 'active') || !w.wish || w.saved >= w.price) return 0;
  return w.desire * 20 + w.necessity * 25 + w.utility * 30
    + timeScore((now - w.startDate) / 86400) * 25;
}

export function allocateFund<T extends AllocationWish>(items: readonly T[], amount: number, now: number): { wishes: T[]; extra: number; allocations: number[] } {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid deposit');
  for (const w of items) {
    if (!Number.isSafeInteger(w.price) || !Number.isSafeInteger(w.saved) || w.saved < 0 || w.price <= 0 || w.saved > w.price
        || !Number.isFinite(w.startDate) || ![w.necessity,w.utility,w.desire].every(n => Number.isInteger(n) && n >= 0 && n <= 10)) {
      throw new Error('Invalid wish');
    }
  }
  const wishes = items.map(w => ({ ...w }));
  const allocations = items.map(() => 0);
  let remaining = BigInt(amount);
  while (remaining > 0n) {
    const active = wishes.map((w,i) => ({ i, weight: BigInt(wishWeight(w,now)), capacity: BigInt(w.price-w.saved) })).filter(w => w.weight > 0n && w.capacity > 0n);
    const total = active.reduce((sum,w) => sum+w.weight,0n);
    if (total === 0n) break;
    const capped = active.filter(w => remaining*w.weight >= w.capacity*total);
    if (capped.length) {
      for (const w of capped) {
        wishes[w.i].saved += Number(w.capacity);
        allocations[w.i] += Number(w.capacity);
        remaining -= w.capacity;
      }
      continue;
    }
    const shares = active.map(w => ({ ...w, share: remaining*w.weight/total, remainder: remaining*w.weight%total }));
    for (const w of shares) {
      wishes[w.i].saved += Number(w.share);
      allocations[w.i] += Number(w.share);
      remaining -= w.share;
    }
    // Largest remainder; ties follow list order. Preserve every cent.
    shares.sort((a,b) => a.remainder === b.remainder ? a.i-b.i : a.remainder > b.remainder ? -1 : 1);
    for (const w of shares) {
      if (!remaining) break;
      wishes[w.i].saved++; allocations[w.i]++; remaining--;
    }
  }
  return { wishes, extra: Number(remaining), allocations };
}

export interface WishFields {
  name: string;
  price: number;
  url: string;
  note: string;
  necessity: number;
  utility: number;
  desire: number;
  wish: boolean;
}

export function wishEditError(saved: number, fields: WishFields): string | null {
  if (!fields.name.trim() || fields.name.trim().length > 100 || fields.note.length > 500) return 'Revisa el nombre (hasta 100 caracteres) y las notas (hasta 500).';
  if (!Number.isSafeInteger(fields.price) || fields.price <= 0) return 'Introduce un precio positivo con hasta dos decimales.';
  if (fields.price < saved) return 'El precio no puede ser menor que lo ya reservado. Cancela el deseo si quieres devolver su reserva al fondo.';
  if (typeof fields.wish !== 'boolean' || ![fields.necessity,fields.utility,fields.desire].every(n => Number.isInteger(n) && n >= 0 && n <= 10)) return 'Las prioridades deben ser enteros entre 0 y 10.';
  if (fields.url.trim()) {
    try {
      const url = new URL(fields.url.trim());
      if (!['http:','https:'].includes(url.protocol) || url.username || url.password) return 'Utiliza un enlace HTTP o HTTPS sin credenciales.';
    } catch { return 'Introduce un enlace HTTP o HTTPS válido.'; }
  }
  return null;
}

export function applyWishEdit<T extends AllocationWish>(current: T, fields: WishFields): T & WishFields {
  const error = wishEditError(current.saved,fields);
  if (error) throw new Error(error);
  // Explicit fields: an edit cannot overwrite identity, age or allocations.
  return { ...current, name: fields.name.trim(), price: fields.price, url: fields.url.trim(), note: fields.note.trim(),
    necessity: fields.necessity, utility: fields.utility, desire: fields.desire, wish: fields.wish };
}

export function cancelFundWish<T extends AllocationWish & { id: string }>(items: readonly T[], id: string, mode: 'redistribute' | 'release', extra: number, now: number): { wishes: T[]; extra: number; released: number } | null {
  const target = items.find(w => w.id === id);
  if (!target) return null;
  if (!['redistribute','release'].includes(mode)) throw new Error('Invalid cancellation choice');
  const remaining = items.filter(w => w.id !== id);
  if (mode === 'release') return { wishes: remaining, extra, released: target.saved };
  const result = allocateFund(remaining,target.saved,now);
  return { wishes: result.wishes, extra: extra + result.extra, released: 0 };
}


export function purchaseWish<T extends AllocationWish>(wish: T, amount: number, transactionId: string): { wish: T & { status: 'purchased'; purchaseTransactionId: string }; extra: number } {
  if ((wish.status && wish.status !== 'active') || !Number.isSafeInteger(amount) || amount <= 0 || !transactionId) throw new Error('Compra no válida o ya registrada.');
  return { wish: { ...wish, status: 'purchased', wish: false, saved: 0, purchaseTransactionId: transactionId }, extra: Math.max(0,wish.saved-amount) };
}
export function archiveWish<T extends AllocationWish>(wish: T): { wish: T & { status: 'archived' }; extra: number } {
  if (wish.status === 'archived') throw new Error('El deseo ya está archivado.');
  return { wish: { ...wish, status: 'archived', wish: false, saved: 0 }, extra: wish.saved };
}
