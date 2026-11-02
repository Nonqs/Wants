import { computed, Injectable, signal } from '@angular/core';
import { accountBalance, monthlyExpenses, monthlyIncome, movementError, editMovement, voidMovement, MovementFields, Transaction } from './demo-ledger';
export type { Transaction } from './demo-ledger';
import { AllocationWish, allocateFund, applyWishEdit, cancelFundWish, wishEditError, WishFields, purchaseWish, archiveWish } from './wish-allocation';

import { Purpose, Pocket, IncomeSplit, IndexStrategy, FundAllocation, defaultPocket, savingsBalance, splitAmount } from './money-flow';

export interface Account { purpose?:Purpose; savingsOffset?:number; id: string; name: string; subtitle: string; initial: number; icon: string; color: string; openedOn: string; }
export interface Wish extends AllocationWish { id: string; image?: string; purchaseTransactionId?: string; name: string; type: string; art: string; symbol: string; note: string; url: string; }

export { cents, euro, localDate } from './money';
import { InvestmentAccount, projectAccount } from './account-projection';
import { SavingsRate } from './savings-math';
import { Instrument, InvestmentTrade, InvestmentPrice, investmentValue, position, validIsin } from './investment-math';
import { localDate, validDate } from './money';
import { prepareRecurringIncome, RecurringIncome } from './recurring-income';

// Temporary UI state. Authoritative accounting will live in Go and MySQL.
@Injectable({ providedIn: 'root' })
export class DemoStore {
  readonly accounts = signal<Account[]>([
    { id: 'daily', name: 'Revolut', subtitle: 'Día a día', initial: 245080, icon: 'R', color: 'lilac', openedOn: localDate() },
    { id: 'saving', name: 'MyInvestor', subtitle: 'Ahorro', initial: 820000, icon: 'M', color: 'sage', openedOn: localDate() },
    { id: 'cash', name: 'Efectivo', subtitle: 'Siempre a mano', initial: 8500, icon: '€', color: 'peach', openedOn: localDate() }
  ]);
  readonly transactions = signal<Transaction[]>([
    { id: 'weekly-shopping', kind: 'expense', concept: 'Compra semanal', amount: 4835, category: 'Comida', account: 'daily', date: localDate() },
    { id: 'coffee', kind: 'expense', concept: 'Café de la mañana', amount: 250, category: 'Comida', account: 'daily', date: localDate() },
    { id: 'spotify', kind: 'expense', concept: 'Spotify', amount: 1099, category: 'Suscripciones', account: 'daily', date: localDate() },
    { id: 'salary-example', kind: 'income', concept: 'Nómina', amount: -185000, category: 'Ingreso', account: 'daily', date: localDate() }
  ]);
  readonly savingsScenarios=signal<{account:string;annualRateBps:number;monthlyContribution:number;years:number}[]>([]);
  readonly indexStrategies=signal<IndexStrategy[]>([]);
  readonly fundAllocations=signal<FundAllocation[]>([]);
  readonly investmentAccounts=signal<InvestmentAccount[]>([]);
  readonly savingsRates=signal<SavingsRate[]>([]);
  readonly instruments=signal<Instrument[]>([]);
  readonly investmentTrades=signal<InvestmentTrade[]>([]);
  readonly investmentPrices=signal<InvestmentPrice[]>([]);
  readonly recurringIncomes = signal<RecurringIncome[]>([]);
  readonly wishes = signal<Wish[]>([
    { id: 'bike', name: 'Una bici para perderme', type: 'AIRE LIBRE', price: 85000, saved: 51000, art: 'bike', symbol: '◎', note: 'Menos prisa, más caminos.', url: '', necessity: 7, utility: 9, desire: 8, wish: true, startDate: Math.floor(Date.now()/1000)-45*86400 },
    { id: 'reading', name: 'Mi rincón de lectura', type: 'EN CASA', price: 32000, saved: 12800, art: 'chair', symbol: '▱', note: 'Un buen libro y nada más.', url: '', necessity: 4, utility: 7, desire: 6, wish: true, startDate: Math.floor(Date.now()/1000)-20*86400 },
    { id: 'trip', name: 'Una escapada al norte', type: 'EXPERIENCIAS', price: 60000, saved: 21000, art: 'mountain', symbol: '△', note: 'Unos días para desconectar.', url: '', necessity: 3, utility: 5, desire: 9, wish: true, startDate: Math.floor(Date.now()/1000)-10*86400 }
  ]);
  readonly total = computed(() => this.accounts().reduce((sum, account) => sum + this.balance(account), 0));
  readonly spendableTotal=computed(()=>this.accounts().filter(a=>a.purpose!=='savings'&&a.purpose!=='investment').reduce((sum,a)=>sum+this.cashBalance(a),0));
  readonly commonExtra = signal(0);
  readonly allocated = computed(() => this.wishes().reduce((sum, wish) => sum + wish.saved, 0));
  readonly reserved = computed(() => this.allocated() + this.commonExtra());
  readonly spent = computed(() => monthlyExpenses(this.transactions(), localDate().slice(0,7)));
  readonly income = computed(() => monthlyIncome(this.transactions(), localDate().slice(0,7)));
  readonly message = signal('');
  readonly defaultAccount = signal('daily');
  readonly lastAccount = signal('daily');
  readonly preferredAccount = computed(() => {
    const accounts = this.accounts().filter(a=>a.purpose!=='savings'&&a.purpose!=='investment');
    return accounts.find(a => a.id === this.lastAccount())?.id
      ?? accounts.find(a => a.id === this.defaultAccount())?.id ?? accounts[0]?.id ?? '';
  });

  setDefaultAccount(id: string): void {
    if (!this.accounts().some(a => a.id === id && a.purpose!=='savings' && a.purpose!=='investment')) return;
    this.defaultAccount.set(id);
    this.lastAccount.set(id);
    this.notify('Cuenta predeterminada actualizada en la demo.');
  }
  addAccount(value: Omit<Account, 'id' | 'icon' | 'color'>, makeDefault: boolean): string {
    const id = crypto.randomUUID();
    const first = !this.accounts().some(a=>a.purpose!=='savings'&&a.purpose!=='investment') && value.purpose!=='savings' && value.purpose!=='investment';
    this.accounts.update(list => [...list, { ...value, id, icon: value.name[0].toUpperCase(), color: 'sage' }]);
    if (first || makeDefault) {
      this.defaultAccount.set(id);
      this.lastAccount.set(id);
    }
    this.notify('Cuenta creada en la demo. Se perderá al recargar.');
    return id;
  }
  startEmptyDemo(): void {
    this.transactions.set([]);
    this.savingsScenarios.set([]);
    this.indexStrategies.set([]);this.fundAllocations.set([]);
    this.investmentAccounts.set([]);
    this.savingsRates.set([]);this.instruments.set([]);this.investmentTrades.set([]);this.investmentPrices.set([]);
    this.recurringIncomes.set([]);
    this.commonExtra.set(0);
    this.wishes.update(list => list.map(w => ({ ...w, saved: 0, status: 'active', purchaseTransactionId: undefined })));
    this.accounts.set([]);
    this.defaultAccount.set('');
    this.lastAccount.set('');
    this.notify('Demo vacía preparada. Los datos reales de la CLI no se han modificado.');
  }
  private timer?: ReturnType<typeof setTimeout>;

  balance(account: Account): number {
    return accountBalance(account, this.transactions().filter(t=>t.date<=localDate()));
  }
  savingsBalance(account:Account):number{return savingsBalance(account,this.transactions().filter(t=>t.date<=localDate()));}
  cashBalance(account:Account):number{return this.balance(account)-this.savingsBalance(account);}
  availablePocket(id:string,pocket:Pocket,date:string,transactions:readonly Transaction[]=this.transactions()):number {
    const a=this.accounts().find(a=>a.id===id);if(!a||!validDate(date)||date<a.openedOn)return 0;
    const cutoff=date<localDate()?date:localDate();
    const balanceAt=(at:string)=>{const dated=transactions.filter(t=>t.date<=at),savings=savingsBalance(a,dated);return pocket==='savings'?savings:accountBalance(a,dated)-savings;};
    return Math.min(balanceAt(cutoff),balanceAt(localDate()));
  }
  contributeSavings(source:string,destination:string,amount:number,pocket:Pocket,date:string):string|null {
    const target=this.accounts().find(a=>a.id===destination);
    if(source===destination)return 'El origen y el destino deben ser cuentas distintas.';
    if(!target||(target.purpose!=='savings'&&target.purpose!=='hybrid'))return 'Selecciona una cuenta de ahorro o híbrida como destino.';
    if(!Number.isSafeInteger(amount)||amount<=0)return 'Introduce un importe positivo con hasta dos decimales.';
    if(!validDate(date)||date>localDate())return 'La transferencia necesita una fecha válida no futura.';
    if(amount>this.availablePocket(source,pocket,date))return 'No hay saldo suficiente en el bolsillo de origen para esa fecha.';
    const error=this.recordMovement({kind:'transfer',concept:'Aportación al ahorro',category:'Transferencia',account:source,destination,amount,date,sourcePocket:pocket,destinationPocket:'savings'});
    if(!error)this.notify('Aportación transferida al ahorro. El saldo total no cambia.');return error;
  }
  defaultPocket(id:string):Pocket{return this.accounts().find(a=>a.id===id)?defaultPocket(this.accounts().find(a=>a.id===id)!):'cash';}
  configurePurpose(id:string,purpose:Purpose,currentSavings:number):string|null {
    const a=this.accounts().find(a=>a.id===id);if(!a||!['cash','savings','hybrid','investment'].includes(purpose))return 'Selecciona una cuenta y un propósito válidos.';
    if(purpose==='hybrid'&&(!Number.isSafeInteger(currentSavings)||currentSavings<0||currentSavings>Math.max(0,this.balance(a))))return 'El ahorro inicial debe estar entre cero y el saldo de la cuenta.';
    const delta=savingsBalance({...a,purpose:'hybrid',savingsOffset:0},this.transactions());
    this.accounts.update(list=>list.map(item=>item.id===id?{...item,purpose,savingsOffset:purpose==='hybrid'?currentSavings-delta:0}:item));
    if((purpose==='savings'||purpose==='investment')&&this.defaultAccount()===id){const next=this.accounts().find(a=>a.purpose!=='savings'&&a.purpose!=='investment')?.id??'';this.defaultAccount.set(next);this.lastAccount.set(next);}
    return null;
  }
  normalizeMovement(t:Transaction):Transaction {
    return {...t,sourcePocket:t.sourcePocket??this.defaultPocket(t.account),destinationPocket:t.kind==='transfer'?(t.destinationPocket??this.defaultPocket(t.destination!)):undefined};
  }
  pocketError(t:Transaction,transactions:readonly Transaction[]):string|null {
    for(const [id,pocket] of [[t.account,t.sourcePocket],[t.destination,t.destinationPocket]]){
      if(!id)continue;const a=this.accounts().find(a=>a.id===id);if(!a)return 'Cuenta inexistente.';
      if(!['cash','savings'].includes(pocket??''))return 'Selecciona efectivo o ahorro.';
      if(a.purpose==='savings'&&pocket!=='savings')return 'La cuenta de ahorro solo recibe y utiliza ahorro.';
      if(a.purpose!=='savings'&&a.purpose!=='hybrid'&&pocket==='savings')return 'Configura la cuenta como ahorro o híbrida antes de usar ese bolsillo.';
    }
    const source=this.accounts().find(a=>a.id===t.account);
    if(source&&t.amount>0&&t.amount>this.availablePocket(source.id,t.sourcePocket??this.defaultPocket(source.id),t.date,transactions))return 'No hay saldo suficiente en el bolsillo seleccionado para esa fecha.';
    return null;
  }
  recordMovement(value: Transaction): string | null {
    if(validDate(value.date)&&value.date>localDate())return 'No se pueden acreditar movimientos futuros. Programa el ingreso para su fecha.';
    if(!this.accounts().some(a=>a.id===value.account)|| (value.destination&&!this.accounts().some(a=>a.id===value.destination)))return 'Selecciona cuentas válidas.';
    value=this.normalizeMovement(value);
    const pocketError=this.pocketError(value,this.transactions());if(pocketError)return pocketError;
    const error = movementError(this.accounts(), this.transactions(), value);
    if (error) return error;
    // One signal update records the complete transfer, including both accounts.
    this.transactions.update(list => [{ ...value, id: crypto.randomUUID(), voidedAt: undefined, concept: value.concept.trim() }, ...list]);
    return null;
  }
  updateMovement(id: string, fields: MovementFields): string | null {
    if(validDate(fields.date)&&fields.date>localDate())return 'No se pueden acreditar movimientos futuros.';
    if(this.transactions().find(t=>t.id===id)?.flowKey)return 'Este movimiento pertenece a un reparto vinculado y no se puede editar por separado.';
    if(this.investmentTrades().some(t=>t.movementId===id))return 'Gestiona esta operación desde Inversiones.';
    const original=this.transactions().find(t=>t.id===id);
    if(original){const pocketError=this.pocketError(this.normalizeMovement({...original,...fields}),this.transactions().filter(t=>t.id!==id));if(pocketError)return pocketError;}
    const result = editMovement(this.accounts(),this.transactions(),id,fields);
    if (result.error !== null) return result.error;
    this.transactions.set(result.transactions);
    this.notify('Movimiento actualizado. Saldos recalculados en la demo.');
    return null;
  }
  voidMovement(id: string): string | null {
    if(this.transactions().find(t=>t.id===id)?.flowKey)return 'Este movimiento pertenece a un reparto vinculado y no se puede anular por separado.';
    if(this.investmentTrades().some(t=>t.movementId===id))return 'Gestiona esta operación desde Inversiones.';
    const result = voidMovement(this.accounts(),this.transactions(),id,new Date().toISOString());
    if (result.error !== null) return result.error;
    this.transactions.set(result.transactions);
    this.wishes.update(list => list.map(w => w.purchaseTransactionId === id ? { ...w, purchaseTransactionId: undefined, status: w.status === 'archived' ? 'archived' : 'active', wish: false } : w));
    this.notify('Movimiento anulado. Saldos recalculados en la demo.');
    return null;
  }
  depositToWishFund(amount: number): string | null {
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > this.spendableTotal() - this.reserved()) {
      return 'Elige un importe positivo dentro del saldo sin reservar.';
    }
    const result = allocateFund(this.wishes(), amount, Math.floor(Date.now()/1000));
    this.wishes.set(result.wishes);
    this.commonExtra.update(extra => extra + result.extra);
    this.notify('Aportación al fondo repartida. El saldo de tus cuentas no cambia.');
    return null;
  }
  distributeFundExtra(): void {
    const result = allocateFund(this.wishes(), this.commonExtra(), Math.floor(Date.now()/1000));
    this.wishes.set(result.wishes);
    this.commonExtra.set(result.extra);
    this.notify('Reparto del pendiente revisado según las prioridades actuales.');
  }
  toggleWish(id: string): void {
    this.wishes.update(list => list.map(w => w.id === id && (!w.status || w.status === 'active') ? { ...w, wish: !w.wish } : w));
  }
  saveWish(id: string | null, fields: WishFields, image?: string): string | null {
    const existing = id ? this.wishes().find(w => w.id === id) : undefined;
    if (id && !existing) return 'Este deseo ya no existe. Cierra el formulario y vuelve a intentarlo.';
    if (existing?.status && existing.status !== 'active') fields = { ...fields, wish: false };
    const error = wishEditError(existing?.saved ?? 0,fields);
    if (error) return error;
    if (this.wishes().some(w => w.id !== id && w.name.toLocaleLowerCase('es') === fields.name.trim().toLocaleLowerCase('es'))) return 'Ya existe un deseo con ese nombre.';
    if (existing) {
      this.wishes.update(list => list.map(w => w.id === id ? { ...applyWishEdit(w,fields), image } : w));
    } else {
      const fresh: Wish = { id: crypto.randomUUID(), image, status: 'active', ...fields, name: fields.name.trim(), url: fields.url.trim(), note: fields.note.trim(), saved: 0,
        startDate: Math.floor(Date.now()/1000), type: 'A TU RITMO', art: 'blank', symbol: '✳' };
      this.wishes.update(list => [...list,fresh]);
    }
    this.notify(existing ? 'Deseo actualizado. Se conservan antigüedad y reserva.' : 'Deseo añadido a esta demo.');
    return null;
  }
  cancelWish(id: string, mode: 'redistribute' | 'release'): string | null {
    const target = this.wishes().find(w => w.id === id);
    if (target?.status && target.status !== 'active') return 'Solo se pueden cancelar deseos activos.';
    const result = cancelFundWish(this.wishes(),id,mode,this.commonExtra(),Math.floor(Date.now()/1000));
    if (!result) return 'Este deseo ya no existe.';
    this.wishes.set(result.wishes);
    this.commonExtra.set(result.extra);
    this.notify(mode === 'redistribute' ? 'Deseo cancelado. Su reserva vuelve al reparto común.' : 'Deseo cancelado. La reserva queda libre en tus cuentas.');
    return null;
  }
  archiveWish(id: string): string | null {
    const target = this.wishes().find(w => w.id === id);
    if (!target || target.status === 'archived') return 'El deseo ya no está disponible para archivar.';
    const result = archiveWish(target);
    this.wishes.update(list => list.map(w => w.id === id ? result.wish : w));
    this.commonExtra.update(extra => extra + result.extra);
    this.notify('Deseo archivado. Su reserva queda pendiente en el fondo común.');
    return null;
  }
  restoreWish(id: string): void {
    this.wishes.update(list => list.map(w => w.id === id && w.status === 'archived' ? { ...w, status: w.purchaseTransactionId ? 'purchased' : 'active', wish: false } : w));
    this.notify('Deseo restaurado. Las reservas previas no se vuelven a asignar.');
  }
  buyWish(id: string, amount: number, account: string, date: string, existingExpenseId: string): string | null {
    const target = this.wishes().find(w => w.id === id);
    if (!target || (target.status && target.status !== 'active')) return 'La compra ya está registrada o el deseo no está activo.';
    let transaction: Transaction;
    if (existingExpenseId) {
      const existing = this.transactions().find(t => t.id === existingExpenseId && t.kind === 'expense' && !t.voidedAt);
      if (!existing || this.wishes().some(w => w.purchaseTransactionId === existingExpenseId)) return 'Elige un gasto activo que no esté vinculado a otro deseo.';
      transaction = existing;
    } else {
      transaction = this.normalizeMovement({ id: crypto.randomUUID(), kind: 'expense', concept: target.name, category: 'Compras', amount, account, date });
      const error = movementError(this.accounts(),this.transactions(),transaction) ?? this.pocketError(transaction,this.transactions());
      if (error) return error;
      if (date > localDate()) return 'Una compra realizada no puede tener fecha futura.';
    }
    if (transaction.date > localDate()) return 'Selecciona un gasto con fecha no futura.';
    const result = purchaseWish(target,transaction.amount,transaction.id!);
    if (!existingExpenseId) this.transactions.update(list => [transaction,...list]);
    this.wishes.update(list => list.map(w => w.id === id ? result.wish : w));
    this.commonExtra.update(extra => extra + result.extra);
    this.notify(existingExpenseId ? 'Compra vinculada al gasto existente, sin duplicarlo.' : 'Compra registrada con su gasto. El sobrante queda en el fondo.');
    return null;
  }
  saveInvestmentAccount(value: InvestmentAccount): string | null {
    const account=this.accounts().find(a=>a.id===value.account);
    if(!account||!validDate(value.asOf)||value.asOf<account.openedOn||value.asOf>localDate())return 'Selecciona una cuenta y una fecha válida entre su apertura y hoy.';
    try{projectAccount(value.capital,value.monthlyContribution,value.annualRateBps,value.years);}catch(error){return error instanceof Error?error.message:'Revisa los datos de proyección.';}
    this.investmentAccounts.update(list=>[...list.filter(p=>p.account!==value.account),{...value,flowCapital:value.flowCapital??0}]);return null;
  }
  addSavingsRate(account: string, from: string, taeBasisPoints: number): string | null {
    const target=this.accounts().find(a=>a.id===account);
    if(!target||!validDate(from)||from<target.openedOn||!Number.isInteger(taeBasisPoints)||taeBasisPoints<0||taeBasisPoints>10000)return 'Revisa la cuenta, la fecha y una TAE entre 0 y 100 %.';
    if(this.savingsRates().some(r=>r.account===account&&r.from===from))return 'Ya existe una tasa para esa cuenta y fecha.';
    this.savingsRates.update(list=>[...list,{id:crypto.randomUUID(),account,from,taeBasisPoints}]);return null;
  }
  addInstrument(name: string, isin: string, shareClass: string): string | null {
    isin=isin.trim().toUpperCase();
    if(!name.trim()||name.length>100||!shareClass.trim()||shareClass.length>100||!validIsin(isin))return 'Revisa el nombre, la clase exacta y un ISIN válido.';
    if(this.instruments().some(i=>i.isin===isin))return 'Ese ISIN ya está registrado.';
    this.instruments.update(list=>[...list,{id:crypto.randomUUID(),name:name.trim(),isin,shareClass:shareClass.trim(),currency:'EUR'}]);return null;
  }
  addInvestmentPrice(value: InvestmentPrice): string | null {
    if(!this.instruments().some(i=>i.id===value.instrument)||!Number.isSafeInteger(value.price)||value.price<=0||!validDate(value.date)||value.date>localDate()||!value.source.trim()||value.source.length>100)return 'Revisa el instrumento, valor, fecha no futura y fuente.';
    if(this.investmentPrices().some(p=>p.instrument===value.instrument&&p.date===value.date))return 'Ya hay un valor para esa fecha.';
    this.investmentPrices.update(list=>[...list,{...value,source:value.source.trim()}]);return null;
  }
  addInvestmentTrade(value: Omit<InvestmentTrade,'id'|'movementId'>): string | null {
    if(!this.instruments().some(i=>i.id===value.instrument)||!['buy','sell'].includes(value.kind)||!Number.isSafeInteger(value.units)||value.units<=0||!Number.isSafeInteger(value.price)||value.price<=0||!Number.isSafeInteger(value.fees)||value.fees<0||!validDate(value.date)||value.date>localDate())return 'Revisa las participaciones, precio, comisiones y fecha.';
    try {
      const gross=investmentValue(value.units,value.price),amount=value.kind==='buy'?gross+value.fees:-(gross-value.fees);
      if(gross<=0||(value.kind==='sell'&&gross<=value.fees))return 'El valor de la operación debe superar cero y las comisiones de venta.';
      const trade:InvestmentTrade={...value,id:crypto.randomUUID(),movementId:crypto.randomUUID(),voided:false};
      position([...this.investmentTrades(),trade],value.instrument);
      const instrument=this.instruments().find(i=>i.id===value.instrument)!;
      const movement:Transaction=this.normalizeMovement({id:trade.movementId,kind:value.kind==='buy'?'investment-buy':'investment-sell',concept:instrument.name,amount,category:value.kind==='buy'?'Compra de inversión':'Venta de inversión',account:value.account,date:value.date});
      const error=movementError(this.accounts(),this.transactions(),movement)??this.pocketError(movement,this.transactions());if(error)return error;
      this.transactions.update(list=>[movement,...list]);this.investmentTrades.update(list=>[...list,trade]);return null;
    }catch(error){return error instanceof Error?error.message:'No se pudo registrar la operación.';}
  }
  voidInvestmentTrade(id: string): string | null {
    const trade=this.investmentTrades().find(t=>t.id===id&&!t.voided);if(!trade)return 'La operación ya está anulada.';
    try {
      const trades=this.investmentTrades().map(t=>t.id===id?{...t,voided:true}:t);position(trades,trade.instrument);
      const result=voidMovement(this.accounts(),this.transactions(),trade.movementId,new Date().toISOString());if(result.error)return result.error;
      this.transactions.set(result.transactions!);this.investmentTrades.set(trades);return null;
    }catch(error){return error instanceof Error?error.message:'No se puede anular esta operación.';}
  }
  plannedMonthly(account:string,pocket:'cash'|'savings'|'investment'):number|null {
    let amount=0;
    for(const plan of this.recurringIncomes().filter(p=>p.enabled&&p.nextOn&&(!p.endOn||p.endOn>=localDate()))){
      const splits=plan.splits??[];let parts:number[];
      try{parts=splitAmount(plan.amount,splits.map(s=>s.percentBps)).parts;}catch{return null;}
      if(plan.account===account&&pocket===(plan.pocket??this.defaultPocket(account)))amount+=plan.amount-parts.reduce((a,b)=>a+b,0);
      splits.forEach((s,i)=>{if(s.account===account&&s.pocket===pocket)amount+=parts[i];});
      if(!Number.isSafeInteger(amount))return null;
    }return amount;
  }
  saveSavingsScenario(account:string,annualRateBps:number,monthlyContribution:number,years:number):string|null {
    const a=this.accounts().find(a=>a.id===account);if(!a||(a.purpose!=='savings'&&a.purpose!=='hybrid'))return 'Selecciona una cuenta de ahorro.';
    try{projectAccount(Math.max(0,this.savingsBalance(a)),monthlyContribution,annualRateBps,years);}catch(error){return (error as Error).message;}
    this.savingsScenarios.update(list=>[...list.filter(s=>s.account!==account),{account,annualRateBps,monthlyContribution,years}]);return null;
  }
  investmentDate(p:InvestmentAccount):string{return p.flowAsOf&&p.flowAsOf>p.asOf?p.flowAsOf:p.asOf;}
  investmentCapital(p:InvestmentAccount):number{return p.capital+(p.flowCapital??0);}
  saveIndexStrategy(strategy:IndexStrategy):string|null {
    if(!this.investmentAccounts().some(p=>p.account===strategy.account))return 'Añade primero la cuenta de inversión.';
    if(!strategy.funds.length||strategy.funds.some(f=>!f.name.trim()||f.name.length>100||!validIsin(f.isin)||!f.id)||new Set(strategy.funds.map(f=>f.isin)).size!==strategy.funds.length)return 'Indica fondos distintos, con nombre e ISIN válidos.';
    try{splitAmount(100,strategy.funds.map(f=>f.weightBps),true);}catch(error){return (error as Error).message;}
    this.indexStrategies.update(list=>[...list.filter(s=>s.account!==strategy.account),structuredClone(strategy)]);return null;
  }
  validateSplits(source:string,splits:IncomeSplit[],date:string):string|null {
    try{splitAmount(100,splits.map(s=>s.percentBps));}catch(error){return (error as Error).message;}
    for(const s of splits){const a=this.accounts().find(a=>a.id===s.account);
      if(!a||a.id===source||date<a.openedOn)return 'El destino debe ser otra cuenta existente y abierta en la fecha del ingreso.';
      if(s.pocket==='investment'){
        const profile=this.investmentAccounts().find(p=>p.account===a.id);if(!profile||!this.indexStrategies().some(p=>p.account===a.id))return 'Configura la cuenta de inversión y su estrategia de fondos antes del reparto.';
        if(date<profile.asOf)return 'La fecha del reparto no puede ser anterior al importe declarado de inversión; revisa la fecha inicial.';
      }else{const error=this.pocketError({kind:'income',account:a.id,amount:-1,concept:'Validación',category:'Ingreso',date,sourcePocket:s.pocket},[]);if(error)return error;}
    }return null;
  }
  addRecurringIncome(value: Omit<RecurringIncome, 'id' | 'nextOn' | 'enabled'>): string | null {
    if (!validDate(value.startOn) || (value.endOn && (!validDate(value.endOn) || value.endOn < value.startOn))) {
      return 'Revisa la fecha de inicio y la fecha de fin.';
    }
    const account=this.accounts().find(a=>a.id===value.account);if(!account)return 'Selecciona una cuenta válida.';
    const pocketError=this.pocketError({kind:'income',concept:value.concept,amount:-value.amount,category:'Ingreso',account:value.account,date:value.startOn,sourcePocket:value.pocket??this.defaultPocket(value.account)},[]);if(pocketError)return pocketError;
    const splitError=this.validateSplits(value.account,value.splits??[],value.startOn);if(splitError)return splitError;
    const error = movementError(this.accounts(), this.transactions(), {
      kind: 'income', concept: value.concept, amount: -value.amount,
      account: value.account, category: 'Ingreso recurrente', date: value.startOn
    });
    if (error) return error;
    this.recurringIncomes.update(list => [...list, { ...value, concept: value.concept.trim(), id: crypto.randomUUID(), nextOn: value.startOn, enabled: true }]);
    this.notify('Ingreso mensual programado en la demo. No se ha sumado al saldo.');
    return null;
  }
  registerRecurringIncome(id: string): void {
    const schedule = this.recurringIncomes().find(item => item.id === id);
    if (!schedule) return;
    const result = prepareRecurringIncome(schedule, this.transactions(), localDate());
    if (!result) return;
    if (result.movement) {
      const splits=schedule.splits??[],splitError=this.validateSplits(schedule.account,splits,result.movement.date);
      if(splitError){this.notify(splitError);return;}
      try{
        const key=result.movement.recurringKey!,parts=splitAmount(schedule.amount,splits.map(s=>s.percentBps)).parts;
        const batch:Transaction[]=[{...this.normalizeMovement(result.movement),id:crypto.randomUUID(),flowKey:splits.length?key:undefined}];
        const allocations:FundAllocation[]=[],profiles=this.investmentAccounts().map(p=>({...p}));
        splits.forEach((s,i)=>{
          const amount=parts[i];if(!amount)return;
          const destinationPocket=s.pocket==='investment'?this.defaultPocket(s.account):s.pocket;
          batch.push({id:crypto.randomUUID(),kind:'transfer',concept:('Reparto de '+schedule.concept).slice(0,100),category:'Reparto programado',account:schedule.account,destination:s.account,amount,date:result.movement!.date,sourcePocket:batch[0].sourcePocket,destinationPocket,flowKey:key});
          if(s.pocket==='investment'){
            const strategy=this.indexStrategies().find(p=>p.account===s.account)!;
            const fundParts=splitAmount(amount,strategy.funds.map(f=>f.weightBps),true).parts;
            batch.push({id:crypto.randomUUID(),kind:'investment-buy',concept:'Asignación indexada',category:'Aportación a fondos',account:s.account,sourcePocket:destinationPocket,amount,date:result.movement!.date,flowKey:key});
            strategy.funds.forEach((f,j)=>{if(fundParts[j])allocations.push({id:crypto.randomUUID(),account:s.account,fund:f.id,name:f.name,isin:f.isin,amount:fundParts[j],date:result.movement!.date,flowKey:key});});
            const p=profiles.find(p=>p.account===s.account)!;p.flowCapital=(p.flowCapital??0)+amount;p.flowAsOf=p.flowAsOf&&p.flowAsOf>result.movement!.date?p.flowAsOf:result.movement!.date;
            if(!Number.isSafeInteger(this.investmentCapital(p)))throw new Error('El capital invertido supera el límite.');
            projectAccount(this.investmentCapital(p),p.monthlyContribution,p.annualRateBps,p.years);
          }
        });
        let transactions=this.transactions();
        for(const t of batch){const error=movementError(this.accounts(),transactions,t)??this.pocketError(t,transactions);if(error)throw new Error(error);transactions=[t,...transactions];}
        this.transactions.set(transactions);this.fundAllocations.update(list=>[...list,...allocations]);this.investmentAccounts.set(profiles);
      }catch(error){this.notify((error as Error).message);return;}
    }
    this.recurringIncomes.update(list => list.map(item => item.id === id ? { ...item, nextOn: result.next } : item));
    this.notify(result.movement ? 'Ingreso vencido registrado en la demo.' : 'Este vencimiento ya estaba registrado.');
  }
  toggleRecurringIncome(id: string): void {
    this.recurringIncomes.update(list => list.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  }
  accountName(id: string): string { return this.accounts().find(a => a.id === id)?.name ?? ''; }
  notify(message: string): void {
    this.message.set(message);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(''), 4500);
  }
}
