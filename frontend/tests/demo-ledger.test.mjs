import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountBalance, monthlyExpenses, monthlyIncome, movementError } from '../src/app/demo-ledger.ts';

const accounts = [
  { id: 'daily', initial: 10000, openedOn: '2026-01-01' },
  { id: 'saving', initial: 0, openedOn: '2026-01-10' }
];
const transfer = { kind: 'transfer', concept: 'Ahorro', amount: 2000, category: 'Transferencia', account: 'daily', destination: 'saving', date: '2026-02-01' };
const total = movements => accounts.reduce((sum,a) => sum + accountBalance(a,movements), 0);

test('transferencia de 20 EUR conserva patrimonio y se registra una sola vez', () => {
  const movements = [transfer];
  assert.equal(movementError(accounts, [], transfer), null);
  assert.equal(accountBalance(accounts[0], movements), 8000);
  assert.equal(accountBalance(accounts[1], movements), 2000);
  assert.equal(total(movements), total([]));
  assert.equal(monthlyExpenses(movements, '2026-02'), 0);
  assert.equal(monthlyIncome(movements, '2026-02'), 0);
  assert.equal(movements.length, 1);
});

test('ingreso aumenta el saldo una vez; gasto y transferencia no inflan ingresos', () => {
  const income = { kind: 'income', concept: 'Nómina', amount: -5000, category: 'Ingreso', account: 'daily', date: '2026-02-01' };
  const expense = { kind: 'expense', concept: 'Café', amount: 250, category: 'Comida', account: 'daily', date: '2026-02-01' };
  const movements = [transfer, income, expense];
  assert.equal(movementError(accounts, [], income), null);
  assert.equal(accountBalance(accounts[0], movements), 12750);
  assert.equal(accountBalance(accounts[1], movements), 2000);
  assert.equal(total(movements), 14750);
  assert.equal(monthlyExpenses(movements, '2026-02'), 250);
  assert.equal(monthlyIncome(movements, '2026-02'), 5000);
  assert.equal(monthlyIncome(movements, '2026-03'), 0);
});

test('rechaza misma cuenta, cuenta inexistente, fechas e importes incorrectos sin mutar datos', () => {
  const movements = [];
  for (const changes of [
    { destination: 'daily' }, { destination: '' }, { destination: 'missing' }, { account: 'missing' },
    { date: '2026-01-05' }, { date: '2025-12-31' }, { date: '2026-02-30' },
    { amount: 0 }, { amount: -100 }, { amount: 1.5 }, { amount: Number.MAX_SAFE_INTEGER + 1 },
    { concept: '  ' }, { kind: 'income', amount: 2000, destination: undefined },
    { kind: 'expense' }, { kind: 'unexpected' }
  ]) {
    assert.ok(movementError(accounts, movements, { ...transfer, ...changes }), JSON.stringify(changes));
  }
  assert.deepEqual(movements, []);
  assert.equal(total(movements), 10000);
});

test('transferencias de vuelta y fechas de apertura límite', () => {
  const forward = { ...transfer, date: '2026-01-10' };
  const back = { ...transfer, account: 'saving', destination: 'daily', amount: 1000 };
  assert.equal(movementError(accounts, [], forward), null);
  assert.equal(accountBalance(accounts[0], [forward, back]), 9000);
  assert.equal(accountBalance(accounts[1], [forward, back]), 1000);
  assert.equal(total([forward, back]), 10000);
});

test('rechaza un ingreso que haría perder precisión al saldo', () => {
  const full = [{ id: 'daily', initial: Number.MAX_SAFE_INTEGER, openedOn: '2026-01-01' }];
  assert.ok(movementError(full, [], { ...transfer, kind: 'income', amount: -1, destination: undefined }));
});
