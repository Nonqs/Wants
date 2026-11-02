// Presentation-only ledger for the in-memory demo. Go will own accounting rules.
export interface LedgerAccount { id: string; initial: number; openedOn: string; }
export interface Transaction {
  id?: string;
  voidedAt?: string;
  kind: 'expense' | 'income' | 'transfer' | 'investment-buy' | 'investment-sell';
  concept: string;
  // Expense/transfer amounts are positive; income amounts are negative.
  amount: number;
  category: string;
  account: string;
  destination?: string;
  date: string;
  notes?: string;
  recurringKey?: string;
  sourcePocket?: 'cash'|'savings';
  destinationPocket?: 'cash'|'savings';
  flowKey?: string;
}

export function accountBalance(account: LedgerAccount, transactions: readonly Transaction[]): number {
  return transactions.filter(t => !t.voidedAt).reduce((balance, t) => balance
    - (t.account === account.id ? t.amount : 0)
    + (t.kind === 'transfer' && t.destination === account.id ? t.amount : 0), account.initial);
}

export function monthlyExpenses(transactions: readonly Transaction[], month: string): number {
  return transactions.filter(t => !t.voidedAt && t.kind === 'expense' && t.date.slice(0,7) === month)
    .reduce((sum,t) => sum + t.amount, 0);
}

export function monthlyIncome(transactions: readonly Transaction[], month: string): number {
  return transactions.filter(t => !t.voidedAt && t.kind === 'income' && t.date.slice(0,7) === month)
    .reduce((sum,t) => sum - t.amount, 0);
}

export function movementError(accounts: readonly LedgerAccount[], transactions: readonly Transaction[], t: Transaction): string | null {
  if (!['expense', 'income', 'transfer', 'investment-buy', 'investment-sell'].includes(t.kind) || !Number.isSafeInteger(t.amount)
      || t.amount === 0 || (['income','investment-sell'].includes(t.kind) ? t.amount > 0 : t.amount < 0)) {
    return 'Introduce un importe positivo con hasta dos decimales.';
  }
  const source = accounts.find(a => a.id === t.account);
  const destination = accounts.find(a => a.id === t.destination);
  if (!source) return 'Selecciona una cuenta válida.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date) || t.date.startsWith('0000')) return 'Introduce una fecha válida.';
  const date = new Date(`${t.date}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== t.date) return 'Introduce una fecha válida.';
  if (t.date < source.openedOn) return 'La fecha debe ser igual o posterior a la del saldo inicial de origen.';
  if (!t.category.trim() || t.category.length > 60) return 'Revisa la categoría (hasta 60 caracteres).';
  if (!t.concept.trim() || t.concept.trim().length > 100 || (t.notes?.length ?? 0) > 500) return 'Revisa el concepto y las notas.';
  if (t.kind === 'transfer') {
    if (!destination || destination.id === source.id) return 'Elige dos cuentas distintas para la transferencia.';
    if (t.date < destination.openedOn) return 'La fecha debe ser igual o posterior a la del saldo inicial de destino.';
  } else if (t.destination) return 'Un gasto o ingreso solo puede tener una cuenta.';
  const updated = [t, ...transactions];
  if (accounts.some(a => !Number.isSafeInteger(accountBalance(a, updated)))
      || !Number.isSafeInteger(accounts.reduce((sum,a) => sum + accountBalance(a, updated), 0))) {
    return 'El importe supera el límite de cálculo de esta demo.';
  }
  return null;
}


export type MovementFields = Pick<Transaction, 'concept' | 'amount' | 'category' | 'account' | 'destination' | 'date' | 'notes' | 'sourcePocket' | 'destinationPocket'>;
export type MovementChange = { transactions: Transaction[]; error: null } | { transactions: null; error: string };

export function editMovement(accounts: readonly LedgerAccount[], transactions: readonly Transaction[], id: string, fields: MovementFields): MovementChange {
  const original = transactions.find(t => t.id === id);
  if (!original || original.voidedAt) return { transactions: null, error: 'El movimiento ya no está disponible para editar.' };
  const edited: Transaction = { ...original, concept: fields.concept.trim(), amount: fields.amount,
    category: fields.category.trim(), sourcePocket: fields.sourcePocket ?? original.sourcePocket, destinationPocket: fields.destinationPocket ?? original.destinationPocket, account: fields.account, date: fields.date, notes: fields.notes,
    destination: original.kind === 'transfer' ? fields.destination : undefined };
  const error = movementError(accounts,transactions.filter(t => t.id !== id),edited);
  if (error) return { transactions: null, error };
  return { transactions: transactions.map(t => t.id === id ? edited : t), error: null };
}

export function voidMovement(accounts: readonly LedgerAccount[], transactions: readonly Transaction[], id: string, when: string): MovementChange {
  const original = transactions.find(t => t.id === id);
  if (!original || original.voidedAt) return { transactions: null, error: 'El movimiento ya está anulado o no existe.' };
  const updated = transactions.map(t => t.id === id ? { ...t, voidedAt: when } : t);
  if (accounts.some(a => !Number.isSafeInteger(accountBalance(a,updated))) || !Number.isSafeInteger(accounts.reduce((sum,a) => sum + accountBalance(a,updated),0))) {
    return { transactions: null, error: 'La anulación supera el límite de cálculo de esta demo.' };
  }
  return { transactions: updated, error: null };
}
