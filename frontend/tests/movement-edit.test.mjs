import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountBalance, editMovement, voidMovement, monthlyExpenses, monthlyIncome } from '../src/app/demo-ledger.ts';
import { prepareRecurringIncome } from '../src/app/recurring-income.ts';

const accounts=[{id:'a',initial:10000,openedOn:'2026-01-01'},{id:'b',initial:0,openedOn:'2026-01-01'},{id:'c',initial:5000,openedOn:'2026-01-01'}];
const expense={id:'coffee',kind:'expense',concept:'Café',amount:250,category:'Comida',account:'a',date:'2026-02-01'};
const fields=(t,patch={})=>({concept:t.concept,amount:t.amount,category:t.category,account:t.account,destination:t.destination,date:t.date,notes:t.notes,...patch});
const total=tx=>accounts.reduce((sum,a)=>sum+accountBalance(a,tx),0);

test('gasto 100 -> 97,50 -> edición 97 -> anulación 100',()=>{
  const before=[expense];
  assert.equal(accountBalance(accounts[0],before),9750);
  const edited=editMovement(accounts,before,'coffee',fields(expense,{amount:300}));
  assert.equal(edited.error,null);
  assert.equal(accountBalance(accounts[0],edited.transactions),9700);
  assert.equal(monthlyExpenses(edited.transactions,'2026-02'),300);
  const canceled=voidMovement(accounts,edited.transactions,'coffee','2026-02-02T12:00:00Z');
  assert.equal(canceled.error,null);
  assert.equal(accountBalance(accounts[0],canceled.transactions),10000);
  assert.equal(monthlyExpenses(canceled.transactions,'2026-02'),0);
  assert.equal(canceled.transactions.length,1);
  assert.equal(before[0].amount,250);
  assert.equal(before[0].voidedAt,undefined);
});

test('editar transferencia cambia cuentas e importe sin duplicar patrimonio',()=>{
  const t={...expense,id:'transfer',kind:'transfer',amount:2000,category:'Transferencia',destination:'b'};
  const before=[t];
  assert.equal(accountBalance(accounts[0],before),8000);
  assert.equal(accountBalance(accounts[1],before),2000);
  const edited=editMovement(accounts,before,'transfer',fields(t,{account:'b',destination:'c',amount:1000}));
  assert.equal(edited.error,null);
  assert.equal(accountBalance(accounts[0],edited.transactions),10000);
  assert.equal(accountBalance(accounts[1],edited.transactions),-1000);
  assert.equal(accountBalance(accounts[2],edited.transactions),6000);
  assert.equal(total(edited.transactions),total([]));
  assert.equal(edited.transactions.length,1);
  const canceled=voidMovement(accounts,edited.transactions,'transfer','2026-02-02T12:00:00Z');
  assert.equal(accountBalance(accounts[1],canceled.transactions),0);
  assert.equal(accountBalance(accounts[2],canceled.transactions),5000);
  assert.equal(total(canceled.transactions),total([]));
});

test('cambiar fecha y cuenta de un ingreso mueve el saldo y el resumen mensual',()=>{
  const t={...expense,id:'income',kind:'income',amount:-5000,category:'Ingreso'};
  const result=editMovement(accounts,[t],'income',fields(t,{date:'2026-03-01',account:'b',amount:-6000}));
  assert.equal(result.error,null);
  assert.equal(accountBalance(accounts[0],result.transactions),10000);
  assert.equal(accountBalance(accounts[1],result.transactions),6000);
  assert.equal(monthlyIncome(result.transactions,'2026-02'),0);
  assert.equal(monthlyIncome(result.transactions,'2026-03'),6000);
  const canceled=voidMovement(accounts,result.transactions,'income','2026-03-02T12:00:00Z');
  assert.equal(accountBalance(accounts[1],canceled.transactions),0);
  assert.equal(monthlyIncome(canceled.transactions,'2026-03'),0);
});

test('anular o editar un recurrente conserva su clave y no regenera el vencimiento',()=>{
  const schedule={id:'salary',concept:'Nómina',amount:150000,account:'a',startOn:'2026-02-01',nextOn:'2026-02-01',endOn:'',enabled:true};
  const movement={...prepareRecurringIncome(schedule,[],'2026-02-01').movement,id:'recurring'};
  const result=editMovement(accounts,[movement],'recurring',fields(movement,{date:'2026-02-03',amount:-140000,recurringKey:'injected',id:'other',kind:'expense'}));
  assert.equal(result.error,null);
  assert.equal(result.transactions[0].recurringKey,'salary:2026-02-01');
  assert.equal(result.transactions[0].id,'recurring');
  assert.equal(result.transactions[0].kind,'income');
  assert.equal(prepareRecurringIncome(schedule,result.transactions,'2026-02-05').movement,null);
  const canceled=voidMovement(accounts,result.transactions,'recurring','2026-02-05T12:00:00Z');
  assert.equal(prepareRecurringIncome(schedule,canceled.transactions,'2026-02-05').movement,null);
  assert.equal(accountBalance(accounts[0],canceled.transactions),10000);
});

test('rechaza edición inválida y segunda anulación sin modificar originales',()=>{
  for (const patch of [{amount:0},{amount:-100},{account:'missing'},{date:'2026-02-30'},{date:'2025-12-31'},{category:' '},{concept:' '}]) {
    const result=editMovement(accounts,[expense],'coffee',fields(expense,patch));
    assert.ok(result.error);
    assert.equal(result.transactions,null);
  }
  assert.ok(editMovement(accounts,[expense],'missing',fields(expense)).error);
  const canceled=voidMovement(accounts,[expense],'coffee','2026-02-02T12:00:00Z');
  assert.ok(voidMovement(accounts,canceled.transactions,'coffee','2026-02-03T12:00:00Z').error);
  assert.ok(editMovement(accounts,canceled.transactions,'coffee',fields(expense)).error);
  assert.equal(accountBalance(accounts[0],canceled.transactions),10000);
  assert.equal(expense.voidedAt,undefined);
});

test('anulación que supera el límite exacto no devuelve un estado parcial',()=>{
  const low=[{id:'a',initial:-Number.MAX_SAFE_INTEGER,openedOn:'2026-01-01'}];
  const movements=[{...expense,amount:1},{...expense,id:'income',kind:'income',amount:-1}];
  const result=voidMovement(low,movements,'income','2026-02-02T12:00:00Z');
  assert.ok(result.error);
  assert.equal(result.transactions,null);
  assert.equal(movements[1].voidedAt,undefined);
});
