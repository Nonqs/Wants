import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateFund, timeScore, wishWeight, applyWishEdit, wishEditError, cancelFundWish } from '../src/app/wish-allocation.ts';

const now = 1800000000;
const item = (changes = {}) => ({ name: 'Deseo', price: 10000, saved: 0, necessity: 0, utility: 10, desire: 0, wish: true, startDate: now, ...changes });

test('conserva los pesos y umbrales de antigüedad de la CLI', () => {
  for (const [days,expected] of [[0,0],[6.999,0],[7,1],[29.999,1],[30,2],[89.999,2],[90,4]]) assert.equal(timeScore(days),expected);
  assert.equal(wishWeight(item({ necessity: 4, utility: 6, desire: 8, startDate: now-30*86400 }),now), 490);
  assert.equal(wishWeight(item({ wish: false }),now),0);
  assert.equal(wishWeight(item({ saved: 10000 }),now),0);
});

test('una aportación al fondo se reparte proporcionalmente sin mutar los originales', () => {
  const items = [item(), item({utility:5})];
  const result = allocateFund(items,900,now);
  assert.deepEqual(result.allocations,[600,300]);
  assert.deepEqual(items.map(w=>w.saved),[0,0]);
  assert.equal(result.extra,0);
});

test('completar un deseo redistribuye el sobrante entre los demás', () => {
  const result = allocateFund([item({price:100}),item({utility:5}),item({utility:5})],1000,now);
  assert.deepEqual(result.allocations,[100,450,450]);
  assert.equal(result.extra,0);
});

test('inactivos no reciben aportaciones y el excedente queda en el fondo', () => {
  const result = allocateFund([item({price:100}),item({wish:false}),item({saved:10000})],1000,now);
  assert.deepEqual(result.allocations,[100,0,0]);
  assert.equal(result.extra,900);
  assert.equal(allocateFund([],1000,now).extra,1000);
  assert.equal(allocateFund([item({utility:0})],1000,now).extra,1000);
});

test('los céntimos indivisibles se conservan con desempate estable', () => {
  const items = [item(),item(),item()];
  assert.deepEqual(allocateFund(items,2,now).allocations,[1,1,0]);
  assert.deepEqual(allocateFund(items,100,now).allocations,[34,33,33]);
  assert.equal(allocateFund([item({price:Number.MAX_SAFE_INTEGER})],Number.MAX_SAFE_INTEGER,now).wishes[0].saved,Number.MAX_SAFE_INTEGER);
});

test('el pendiente se puede repartir después sin crear una nueva aportación', () => {
  const pending = allocateFund([item({wish:false})],3000,now);
  const result = allocateFund(pending.wishes.map(w=>({...w,wish:true})),pending.extra,now);
  assert.equal(result.wishes[0].saved+result.extra,3000);
  assert.equal(result.extra,0);
});

test('cada reparto conserva todo el dinero y respeta los precios objetivo', () => {
  for (let n=1;n<=80;n++) {
    const items = Array.from({length:7},(_,i)=>item({price: n*(i+1)+1, utility:(i+n)%11, saved: i, wish:i%3!==0, startDate:now-(i*15)*86400}));
    const amount=n*139;
    const result=allocateFund(items,amount,now);
    assert.equal(result.allocations.reduce((a,b)=>a+b,0)+result.extra,amount);
    result.wishes.forEach((w,i)=>{
      assert.ok(w.saved<=w.price);
      assert.ok(w.saved>=items[i].saved);
      if (!items[i].wish) assert.equal(w.saved,items[i].saved);
    });
  }
});

test('rechaza importes y prioridades inválidos', () => {
  for (const amount of [-1,0.5,NaN,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>allocateFund([item()],amount,now));
  assert.throws(()=>allocateFund([item({necessity:11})],100,now));
});


const fields = changes => ({ name: 'Nombre nuevo', price: 10000, url: 'https://example.com/producto', note: 'Una nota', necessity: 5, utility: 7, desire: 9, wish: true, ...changes });

test('editar conserva identidad, antigüedad y reserva incluso con campos adicionales', () => {
  const original = item({ id: 'one', saved: 3000, startDate: now-100*86400 });
  const edited = applyWishEdit(original, fields({ price: 8000, saved: 0, startDate: now, id: 'other' }));
  assert.equal(edited.id,'one');
  assert.equal(edited.startDate,original.startDate);
  assert.equal(edited.saved,3000);
  assert.equal(edited.name,'Nombre nuevo');
  assert.equal(edited.price,8000);
  assert.equal(original.price,10000);
  assert.ok(wishWeight(edited,now)>wishWeight(item(fields({ startDate: now })),now));
});

test('rechaza precio inferior a lo reservado, prioridades y enlaces inválidos', () => {
  assert.ok(wishEditError(3000,fields({price:2999})));
  assert.throws(()=>applyWishEdit(item({saved:3000}),fields({price:2999})));
  for (const changes of [{necessity:1.5},{utility:11},{desire:-1},{name:'   '},{note:'x'.repeat(501)},{url:'javascript:alert(1)'},{url:'https://user:pass@example.com'},{url:'no es un enlace'}]) {
    assert.ok(wishEditError(0,fields(changes)));
  }
  const complete = applyWishEdit(item({saved:3000}),fields({price:3000}));
  assert.equal(wishWeight(complete,now),0);
  assert.ok(wishWeight(applyWishEdit(complete,fields({price:5000})),now)>0);
});

test('cancelar redistribuye según prioridades y conserva el total reservado', () => {
  const items=[item({id:'one',saved:3000}),item({id:'two'}),item({id:'three',utility:5})];
  const before=items.reduce((sum,w)=>sum+w.saved,0)+200;
  const result=cancelFundWish(items,'one','redistribute',200,now);
  assert.deepEqual(result.wishes.map(w=>w.saved),[2000,1000]);
  assert.equal(result.extra,200);
  assert.equal(result.released,0);
  assert.equal(result.wishes.reduce((sum,w)=>sum+w.saved,0)+result.extra,before);
  assert.equal(items[0].saved,3000);
  assert.equal(items.length,3);
  assert.equal(cancelFundWish(result.wishes,'one','redistribute',result.extra,now),null);
});

test('cancelar conserva excedentes en el fondo cuando no hay capacidad', () => {
  const result=cancelFundWish([item({id:'one',saved:3000}),item({id:'two',price:100})],'one','redistribute',200,now);
  assert.equal(result.wishes[0].saved,100);
  assert.equal(result.extra,3100);
  const last=cancelFundWish([item({id:'one',saved:3000})],'one','redistribute',200,now);
  assert.equal(last.wishes.length,0);
  assert.equal(last.extra,3200);
});

test('liberar reserva no asigna dinero a otros deseos y mantiene el pendiente previo', () => {
  const items=[item({id:'one',saved:3000}),item({id:'two',saved:1000})];
  const result=cancelFundWish(items,'one','release',200,now);
  assert.equal(result.wishes[0].saved,1000);
  assert.equal(result.extra,200);
  assert.equal(result.released,3000);
  assert.equal(result.wishes.reduce((sum,w)=>sum+w.saved,0)+result.extra+result.released,4200);
});
