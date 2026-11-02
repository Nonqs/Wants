// Load the Angular service in Node without a browser or a second implementation.
import '@angular/compiler';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const sourceUrl=new URL('../src/app/demo.store.ts',import.meta.url);
let source=await readFile(sourceUrl,'utf8');
source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText;
source=source.replace(/from ['"](@angular\/core)['"]/g,`from '${import.meta.resolve('@angular/core')}'`)
 .replace(/from ['"]\.\/([^'"]+)['"]/g,(_,name)=>`from '${new URL(name+'.ts',sourceUrl).href}'`);
const {DemoStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const today=new Date();const date=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
function setup(){const s=new DemoStore();s.startEmptyDemo();
 const bbva=s.addAccount({name:'BBVA',initial:0,subtitle:'Nómina',openedOn:date,purpose:'cash'},true);
 const revolut=s.addAccount({name:'Revolut',initial:0,subtitle:'Ahorro',openedOn:date,purpose:'savings'},false);
 const investor=s.addAccount({name:'MyInvestor',initial:0,subtitle:'Inversión',openedOn:date,purpose:'investment'},false);
 assert.equal(s.saveInvestmentAccount({account:investor,capital:0,asOf:date,annualRateBps:0,monthlyContribution:0,years:10}),null);
 assert.equal(s.saveIndexStrategy({account:investor,funds:[{id:'world',name:'Fondo A',isin:'IE00B4L5Y983',weightBps:7000},{id:'other',name:'Fondo B',isin:'IE00B3RBWM25',weightBps:3000}]}),null);
 return {s,bbva,revolut,investor};}
test('ingreso y reparto completos: 60/20/20, estrategia 70/30, idempotencia y patrimonio',()=>{
 const {s,bbva,revolut,investor}=setup();
 assert.equal(s.addRecurringIncome({concept:'Nómina',amount:100000,account:bbva,pocket:'cash',startOn:date,endOn:'',splits:[{account:revolut,pocket:'savings',percentBps:2000},{account:investor,pocket:'investment',percentBps:2000}]}),null);
 const id=s.recurringIncomes()[0].id;assert.equal(s.plannedMonthly(revolut,'savings'),20000);assert.equal(s.plannedMonthly(investor,'investment'),20000);s.registerRecurringIncome(id);
 const a=id=>s.accounts().find(a=>a.id===id);
 assert.equal(s.cashBalance(a(bbva)),60000);assert.equal(s.savingsBalance(a(revolut)),20000);assert.equal(s.balance(a(investor)),0);
 assert.equal(s.investmentCapital(s.investmentAccounts()[0]),20000);
 assert.deepEqual(s.fundAllocations().map(f=>f.amount),[14000,6000]);
 assert.equal(s.spendableTotal(),60000);assert.equal(s.total()+s.investmentCapital(s.investmentAccounts()[0]),100000);
 const count=s.transactions().length;s.registerRecurringIncome(id);assert.equal(s.transactions().length,count);
});
test('un reparto inválido se rechaza sin ingresar dinero ni avanzar fecha',()=>{
 const {s,bbva,revolut,investor}=setup();
 assert.equal(s.addRecurringIncome({concept:'Nómina',amount:100000,account:bbva,startOn:date,endOn:'',splits:[{account:revolut,pocket:'savings',percentBps:2000},{account:investor,pocket:'investment',percentBps:2000}]}),null);
 s.indexStrategies.set([]);const id=s.recurringIncomes()[0].id;s.registerRecurringIncome(id);
 assert.equal(s.transactions().length,0);assert.equal(s.fundAllocations().length,0);assert.equal(s.recurringIncomes()[0].nextOn,date);
});
test('los movimientos del reparto no se editan o anulan por separado',()=>{
 const {s,bbva,revolut}=setup();
 s.addRecurringIncome({concept:'Nómina',amount:100000,account:bbva,startOn:date,endOn:'',splits:[{account:revolut,pocket:'savings',percentBps:2000}]});s.registerRecurringIncome(s.recurringIncomes()[0].id);
 const t=s.transactions()[0];assert.ok(s.voidMovement(t.id));assert.ok(s.updateMovement(t.id,{...t,amount:1}));
});
test('híbrida recibe en el bolsillo seleccionado y no presta ahorro a efectivo',()=>{
 const {s,bbva,revolut}=setup();
 assert.equal(s.configurePurpose(revolut,'hybrid',0),null);
 assert.equal(s.recordMovement({kind:'income',concept:'Nómina',category:'Ingreso',amount:-100000,account:bbva,date,sourcePocket:'cash'}),null);
 assert.equal(s.recordMovement({kind:'transfer',concept:'Ahorro',category:'Transferencia',amount:20000,account:bbva,destination:revolut,destinationPocket:'savings',date}),null);
 const target=s.accounts().find(a=>a.id===revolut);
 assert.equal(s.cashBalance(target),0);assert.equal(s.savingsBalance(target),20000);
 assert.ok(s.recordMovement({kind:'expense',concept:'Café',category:'Comida',amount:250,account:revolut,sourcePocket:'cash',date}));
 assert.equal(s.recordMovement({kind:'income',concept:'Extra',category:'Ingreso',amount:-1000,account:revolut,sourcePocket:'cash',date}),null);
 assert.equal(s.cashBalance(target),1000);assert.equal(s.savingsBalance(target),20000);
});
test('un error durante la distribución de fondos descarta el bloque completo',()=>{
 const {s,bbva,revolut,investor}=setup();
 s.addRecurringIncome({concept:'Nómina',amount:100000,account:bbva,startOn:date,endOn:'',splits:[{account:revolut,pocket:'savings',percentBps:2000},{account:investor,pocket:'investment',percentBps:2000}]});
 s.indexStrategies.update(list=>list.map(strategy=>({...strategy,funds:strategy.funds.map(f=>({...f,weightBps:1000}))})));
 const id=s.recurringIncomes()[0].id;s.registerRecurringIncome(id);
 assert.equal(s.transactions().length,0);assert.equal(s.fundAllocations().length,0);assert.equal(s.investmentCapital(s.investmentAccounts()[0]),0);assert.equal(s.recurringIncomes()[0].nextOn,date);
});
test('ahorro e inversión no están disponibles para el fondo de deseos',()=>{
 const {s,bbva,revolut}=setup();
 s.recordMovement({kind:'income',concept:'Ahorro',category:'Ingreso',amount:-100000,account:revolut,sourcePocket:'savings',date});
 assert.equal(s.total(),100000);assert.equal(s.spendableTotal(),0);assert.ok(s.depositToWishFund(1));
 s.recordMovement({kind:'income',concept:'Efectivo',category:'Ingreso',amount:-5000,account:bbva,sourcePocket:'cash',date});
 assert.equal(s.spendableTotal(),5000);assert.equal(s.depositToWishFund(3000),null);assert.equal(s.reserved(),3000);
});
test('las hipótesis de ahorro se guardan sin acreditar intereses ni mover dinero',()=>{
 const {s,revolut}=setup();
 s.recordMovement({kind:'income',concept:'Ahorro',category:'Ingreso',amount:-100000,account:revolut,sourcePocket:'savings',date});
 const count=s.transactions().length,total=s.total();
 assert.equal(s.saveSavingsScenario(revolut,250,10000,10),null);
 assert.equal(s.savingsScenarios()[0].monthlyContribution,10000);
 assert.equal(s.total(),total);assert.equal(s.transactions().length,count);
 assert.ok(s.saveSavingsScenario(revolut,-10000,0,10));
});
test('aportación al ahorro exige otra cuenta y saldo del bolsillo, sin crear ingresos',()=>{
 const {s,bbva,revolut}=setup();
 s.recordMovement({kind:'income',concept:'Nómina',category:'Ingreso',amount:-10000,account:bbva,date});
 const total=s.total(),before=s.transactions().length;
 assert.ok(s.contributeSavings(revolut,revolut,1,'savings',date));
 assert.ok(s.contributeSavings(bbva,revolut,10001,'cash',date));
 assert.ok(s.contributeSavings(bbva,revolut,2222222222222222,'cash',date));
 assert.equal(s.transactions().length,before);
 assert.equal(s.contributeSavings(bbva,revolut,2500,'cash',date),null);
 assert.equal(s.balance(s.accounts().find(a=>a.id===bbva)),7500);
 assert.equal(s.savingsBalance(s.accounts().find(a=>a.id===revolut)),2500);
 assert.equal(s.total(),total);
 assert.equal(s.transactions().filter(t=>t.kind==='income').length,1);
});
test('el saldo de ahorro de una híbrida no permite financiar una aportación desde efectivo',()=>{
 const {s,bbva,revolut}=setup();
 s.recordMovement({kind:'income',concept:'Saldo',category:'Ingreso',amount:-10000,account:bbva,date});
 assert.equal(s.configurePurpose(bbva,'hybrid',9000),null);
 assert.equal(s.availablePocket(bbva,'cash',date),1000);
 assert.ok(s.contributeSavings(bbva,revolut,1001,'cash',date));
 assert.equal(s.contributeSavings(bbva,revolut,1000,'cash',date),null);
 assert.equal(s.cashBalance(s.accounts().find(a=>a.id===bbva)),0);
 assert.equal(s.savingsBalance(s.accounts().find(a=>a.id===bbva)),9000);
});
test('un ingreso futuro no acredita saldo ni puede financiar una transferencia',()=>{
 const {s,bbva,revolut}=setup();
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);const tomorrow=d.toISOString().slice(0,10);
 assert.ok(s.recordMovement({kind:'income',concept:'Futuro',category:'Ingreso',amount:-100000,account:bbva,date:tomorrow}));
 assert.equal(s.availablePocket(bbva,'cash',date),0);
 assert.ok(s.contributeSavings(bbva,revolut,100,'cash',tomorrow));
 assert.equal(s.transactions().length,0);
});
