import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectAccount } from '../src/app/account-projection.ts';

test('rentabilidad cero conserva capital y suma aportaciones mensuales',()=>{
  const rows=projectAccount(500000,10000,0,10);
  assert.equal(rows.length,11);
  assert.deepEqual(rows[0],{year:0,contributed:500000,value:500000,gain:0});
  assert.deepEqual(rows[10],{year:10,contributed:1700000,value:1700000,gain:0});
});

test('tipo anual efectivo convertido a mensual reproduce un año sin aportaciones',()=>{
  const result=projectAccount(1000000,0,500,1).at(-1);
  assert.equal(result.value,1050000);
  assert.equal(result.gain,50000);
  assert.equal(result.contributed,1000000);
});

test('aportaciones al final de mes y capitalización mensual equivalente',()=>{
  const result=projectAccount(0,10000,1200,1).at(-1);
  const rate=Math.expm1(Math.log1p(.12)/12);
  const expected=Math.round(10000*(Math.pow(1+rate,12)-1)/rate);
  assert.equal(result.value,expected);
  assert.equal(result.contributed,120000);
  assert.equal(result.gain,expected-120000);
});

test('escenario negativo representa pérdidas sin modificar el capital inicial',()=>{
  const rows=projectAccount(500000,0,-1000,2);
  assert.equal(rows[1].value,450000);
  assert.equal(rows[2].value,405000);
  assert.equal(rows[2].gain,-95000);
  assert.equal(rows[0].value,500000);
});

test('rechaza tasas imposibles, entradas inválidas y desbordamiento',()=>{
  for(const args of [[-1,0,0,1],[0,-1,0,1],[100,0,-10000,1],[100,0,10001,1],[100,0,0,0],[100,0,0,51],[100,0,0,1.5],[1.5,0,0,1],[100,0,NaN,1],[Number.MAX_SAFE_INTEGER,1,0,1],[Number.MAX_SAFE_INTEGER,0,10000,1]])assert.throws(()=>projectAccount(...args));
});

test('diferentes cuentas se calculan independientemente',()=>{
  const first=projectAccount(500000,10000,500,10);
  const second=projectAccount(200000,0,0,10);
  assert.equal(second.at(-1).value,200000);
  assert.equal(first[0].value,500000);
  assert.equal(first.at(-1).contributed,1700000);
});
