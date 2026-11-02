import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purchaseWish, archiveWish, wishWeight, allocateFund } from '../src/app/wish-allocation.ts';
import { imageFileError, MAX_IMAGE_BYTES } from '../src/app/wish-image.ts';
import { accountBalance } from '../src/app/demo-ledger.ts';

const now=1800000000;
const wish={id:'bike',name:'Bici',price:10000,saved:8000,necessity:8,utility:9,desire:8,wish:true,startDate:now-100*86400,status:'active',image:'data:image/webp;base64,example'};

test('compra más barata consume la reserva usada y devuelve sobrante al fondo',()=>{
  const result=purchaseWish(wish,6500,'expense');
  assert.equal(result.wish.status,'purchased');
  assert.equal(result.wish.saved,0);
  assert.equal(result.extra,1500);
  assert.equal(result.wish.purchaseTransactionId,'expense');
  assert.equal(result.wish.startDate,wish.startDate);
  assert.equal(result.wish.image,wish.image);
  assert.equal(wish.saved,8000);
  const account={id:'a',initial:20000,openedOn:'2026-01-01'};
  const transactions=[{id:'expense',kind:'expense',concept:'Bici',amount:6500,category:'Compras',account:'a',date:'2026-01-01'}];
  assert.equal(accountBalance(account,transactions),13500);
  assert.equal(8000-result.extra,6500);
});

test('compra más cara no crea reservas negativas y no se puede comprar dos veces',()=>{
  const result=purchaseWish(wish,12000,'expense');
  assert.equal(result.extra,0);
  assert.equal(result.wish.saved,0);
  assert.throws(()=>purchaseWish(result.wish,12000,'another'));
  for(const amount of [0,-1,1.5,NaN])assert.throws(()=>purchaseWish(wish,amount,'expense'));
});

test('archivar pasa reserva al pendiente y conserva datos del deseo',()=>{
  const result=archiveWish(wish);
  assert.equal(result.wish.status,'archived');
  assert.equal(result.wish.wish,false);
  assert.equal(result.wish.saved,0);
  assert.equal(result.extra,8000);
  assert.equal(result.wish.startDate,wish.startDate);
  assert.equal(result.wish.image,wish.image);
  assert.throws(()=>archiveWish(result.wish));
  assert.throws(()=>purchaseWish(result.wish,10000,'expense'));
});

test('archivar un comprado conserva su vínculo y no devuelve dinero adicional',()=>{
  const bought=purchaseWish(wish,6500,'expense');
  const archived=archiveWish(bought.wish);
  assert.equal(archived.extra,0);
  assert.equal(archived.wish.purchaseTransactionId,'expense');
});

test('comprados y archivados quedan excluidos aunque se intente activar su flag',()=>{
  for(const status of ['purchased','archived']){
    const closed={...wish,status,wish:true};
    assert.equal(wishWeight(closed,now),0);
    const result=allocateFund([closed],2000,now);
    assert.equal(result.allocations[0],0);
    assert.equal(result.extra,2000);
  }
});

test('imágenes: admite formatos locales y rechaza SVG, vacíos y más de 5 MB',()=>{
  for(const type of ['image/jpeg','image/png','image/webp'])assert.equal(imageFileError({type,size:MAX_IMAGE_BYTES}),null);
  for(const file of [{type:'image/svg+xml',size:100},{type:'text/html',size:100},{type:'image/png',size:0},{type:'image/jpeg',size:MAX_IMAGE_BYTES+1}])assert.ok(imageFileError(file));
});
