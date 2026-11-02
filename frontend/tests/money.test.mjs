import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cents, signedCents, validDate } from '../src/app/money.ts';

test('importes exactos para gastos y saldos iniciales', () => {
  assert.equal(cents('2,50'), 250);
  assert.equal(cents('0.29'), 29);
  assert.equal(cents(' 12,5 '), 1250);
  assert.equal(signedCents('0,00'), 0);
  assert.equal(signedCents('-125,75'), -12575);
  assert.equal(signedCents('90071992547409,91'), Number.MAX_SAFE_INTEGER);
});

test('rechaza precisión excesiva, formatos ambiguos e importes fuera de rango', () => {
  for (const value of ['', '1,001', '2.345,67', '1e3', 'NaN', 'Infinity', '1 000', '90071992547409,92']) {
    assert.equal(signedCents(value), null, value);
  }
  for (const value of ['0', '-2,50', '-0']) assert.equal(cents(value), null, value);
});

test('saldo inicial 100 EUR y gasto de 2,50 conservan céntimos exactos', () => {
  assert.equal(signedCents('100,00') - cents('2,50'), 9750);
});

test('valida fechas de calendario incluidas fechas bisiestas', () => {
  for (const value of ['2024-02-29', '2026-11-01', '2026-12-31']) assert.equal(validDate(value), true, value);
  for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '2026-1-1']) assert.equal(validDate(value), false, value);
});
