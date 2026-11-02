import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateSavings } from '../src/app/savings-math.ts';
import { investmentValue, position, scaledDecimal, validIsin } from '../src/app/investment-math.ts';
import { accountBalance, monthlyExpenses, monthlyIncome, movementError, voidMovement } from '../src/app/demo-ledger.ts';

const account={id:'cash',initial:100000,openedOn:'2026-01-01'};
const rate={id:'rate',account:'cash',from:'2026-01-01',taeBasisPoints:250};

test('TAE: estimación diaria equivalente, solo fechas vigentes y sin modificar saldos',()=>{
  const daily=Math.expm1(Math.log1p(0.025)/365);
  assert.equal(estimateSavings(account,[],[rate],'2026-01-01','2026-02-01'),Math.round(100000*daily*31));
  assert.equal(estimateSavings(account,[],[rate],'2026-01-01','2026-01-01'),0);
  assert.equal(estimateSavings(account,[],[{...rate,from:'2026-02-01'}],'2026-01-01','2026-02-01'),0);
  assert.equal(account.initial,100000);
});

test('TAE: cambios de saldo, tasas y anulación afectan cada cierre diario',()=>{
  const expense={id:'expense',kind:'expense',concept:'Compra',amount:50000,category:'Compras',account:'cash',date:'2026-01-02'};
  const next={...rate,id:'next',from:'2026-01-03',taeBasisPoints:0};
  const daily=Math.expm1(Math.log1p(.025)/365);
  assert.equal(estimateSavings(account,[expense],[rate,next],'2026-01-01','2026-01-04'),Math.round(150000*daily));
  assert.equal(estimateSavings(account,[{...expense,voidedAt:'2026-01-02'}],[rate,next],'2026-01-01','2026-01-04'),Math.round(200000*daily));
  assert.equal(estimateSavings({...account,initial:-100},[],[rate],'2026-01-01','2026-02-01'),0);
});

test('parseo exacto de participaciones y precio hasta seis decimales',()=>{
  assert.equal(scaledDecimal('1,123456',6),1123456);
  assert.equal(scaledDecimal('100',6),100000000);
  for(const value of ['0','-1','1,1234567','1e3','1.000,00',''])assert.equal(scaledDecimal(value,6),null,value);
  assert.equal(investmentValue(1123456,100000000),11235);
  assert.equal(investmentValue(1000000,100005000),10001);
  assert.throws(()=>investmentValue(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER));
});

test('ISIN: formato y dígito de control',()=>{
  assert.equal(validIsin('IE00B4L5Y983'),true);
  assert.equal(validIsin('IE00B4L5Y984'),false);
  assert.equal(validIsin('INVALID'),false);
});

const buy={id:'buy',instrument:'fund',kind:'buy',units:2000000,price:100000000,fees:100,date:'2026-01-01',account:'cash',movementId:'buy-cash'};
const sell={...buy,id:'sell',kind:'sell',units:1000000,price:120000000,fees:100,date:'2026-01-02',movementId:'sell-cash'};

test('cartera: coste medio, comisiones y resultados sin inventar cotizaciones',()=>{
  const holding=position([buy,sell],'fund');
  assert.equal(holding.units,1000000);
  assert.equal(holding.cost,10050);
  assert.equal(holding.realized,1850);
  assert.equal(investmentValue(holding.units,120000000)-holding.cost,1950);
  assert.equal(position([{...buy,voided:true}],'fund').units,0);
  assert.throws(()=>position([sell],'fund'));
  assert.throws(()=>position([buy,{...sell,units:3000000}],'fund'));
  assert.deepEqual(position([],'fund'),{units:0,cost:0,realized:0});
});

test('compra mueve efectivo a participaciones sin gasto ni doble patrimonio',()=>{
  const movement={id:'buy-cash',kind:'investment-buy',concept:'Fondo',amount:20100,category:'Compra de inversión',account:'cash',date:'2026-01-01'};
  assert.equal(movementError([account],[],movement),null);
  assert.equal(accountBalance(account,[movement]),79900);
  assert.equal(accountBalance(account,[movement])+investmentValue(2000000,100000000),99900);
  assert.equal(monthlyExpenses([movement],'2026-01'),0);
  assert.equal(monthlyIncome([movement],'2026-01'),0);
  const sale={...movement,id:'sell-cash',kind:'investment-sell',amount:-11900,date:'2026-01-02'};
  assert.equal(movementError([account],[movement],sale),null);
  assert.equal(accountBalance(account,[movement,sale]),91800);
  assert.equal(monthlyIncome([sale],'2026-01'),0);
  const annulled=voidMovement([account],[movement],'buy-cash','2026-01-02');
  assert.equal(accountBalance(account,annulled.transactions),100000);
});
