import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount,savingsBalance,defaultPocket } from '../src/app/money-flow.ts';
import { accountBalance } from '../src/app/demo-ledger.ts';

test('20 % ahorro y 20 % inversión dejan el 60 % en origen',()=>{
 assert.deepEqual(splitAmount(100000,[2000,2000]),{parts:[20000,20000],remaining:60000});
 assert.deepEqual(splitAmount(20000,[7000,3000],true),{parts:[14000,6000],remaining:0});
});
test('redondeo conserva todos los céntimos, también con porcentajes fraccionarios',()=>{
 for(let n=1;n<200;n++){
  const r=splitAmount(n,[3333,3333,3334],true);
  assert.equal(r.parts.reduce((a,b)=>a+b,0)+r.remaining,n);
 }
 assert.deepEqual(splitAmount(1,[5000,5000],true),{parts:[1,0],remaining:0});
 for(const weights of [[6000,6000],[-1],[0],[1.5]])assert.throws(()=>splitAmount(100,weights));
 assert.throws(()=>splitAmount(100,[7000],true));
});
test('cuenta solo ahorro no tiene efectivo; híbrida distingue destino sin duplicar saldo',()=>{
 const savings={id:'revolut',purpose:'savings',initial:50000,openedOn:'2026-01-01'};
 const hybrid={id:'hybrid',purpose:'hybrid',initial:100000,savingsOffset:30000,openedOn:'2026-01-01'};
 const transfers=[{kind:'transfer',amount:20000,account:'bbva',destination:'revolut',destinationPocket:'savings',date:'2026-01-05'},
 {kind:'transfer',amount:15000,account:'bbva',destination:'hybrid',destinationPocket:'savings',date:'2026-01-05'},
 {kind:'income',amount:-10000,account:'hybrid',sourcePocket:'cash',date:'2026-01-05'}];
 assert.equal(defaultPocket(savings),'savings');
 assert.equal(savingsBalance(savings,transfers),70000);
 assert.equal(accountBalance(savings,transfers)-savingsBalance(savings,transfers),0);
 assert.equal(savingsBalance(hybrid,transfers),45000);
 assert.equal(accountBalance(hybrid,transfers)-savingsBalance(hybrid,transfers),80000);
 assert.equal(savingsBalance(hybrid,transfers.map(t=>({...t,voidedAt:'2026-01-06'}))),30000);
});
