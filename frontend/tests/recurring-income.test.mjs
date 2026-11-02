import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextMonthlyDate, prepareRecurringIncome } from '../src/app/recurring-income.ts';
import { accountBalance, monthlyIncome, movementError } from '../src/app/demo-ledger.ts';

const schedule = { id: 'salary', concept: 'Nómina', amount: 150000, account: 'daily', startOn: '2026-01-31', endOn: '', nextOn: '2026-01-31', enabled: true };

test('el día 31 se adapta a febrero y recupera el día original en marzo', () => {
  assert.equal(nextMonthlyDate('2026-01-31','2026-01-31'), '2026-02-28');
  assert.equal(nextMonthlyDate('2026-01-31','2026-02-28'), '2026-03-31');
  assert.equal(nextMonthlyDate('2024-01-31','2024-01-31'), '2024-02-29');
  assert.equal(nextMonthlyDate('2026-01-30','2026-02-28'), '2026-03-30');
  assert.equal(nextMonthlyDate('2026-12-15','2026-12-15'), '2027-01-15');
  assert.equal(nextMonthlyDate('9999-12-31','9999-12-31'), null);
});

test('futuros, pausados y finalizados no generan movimientos', () => {
  assert.equal(prepareRecurringIncome(schedule, [], '2026-01-30'), null);
  assert.equal(prepareRecurringIncome({ ...schedule, enabled: false }, [], '2026-02-01'), null);
  assert.equal(prepareRecurringIncome({ ...schedule, nextOn: null }, [], '2026-02-01'), null);
  assert.equal(prepareRecurringIncome({ ...schedule, endOn: '2026-01-30' }, [], '2026-02-01'), null);
});

test('un vencimiento suma una sola vez, y un reintento no crea duplicados', () => {
  const account = { id: 'daily', initial: 10000, openedOn: '2026-01-01' };
  const result = prepareRecurringIncome(schedule, [], '2026-01-31');
  assert.equal(result.next, '2026-02-28');
  assert.equal(result.movement.date, '2026-01-31');
  assert.equal(result.movement.amount, -150000);
  assert.equal(movementError([account], [], result.movement), null);
  const transactions = [result.movement];
  assert.equal(accountBalance(account, transactions), 160000);
  assert.equal(monthlyIncome(transactions, '2026-01'), 150000);
  assert.equal(prepareRecurringIncome(schedule, transactions, '2026-01-31').movement, null);
  assert.equal(prepareRecurringIncome({ ...schedule, nextOn: result.next }, transactions, '2026-01-31'), null);
  assert.equal(transactions.length, 1);
});

test('registra atrasados por fecha y respeta la fecha final inclusiva', () => {
  let current = { ...schedule, endOn: '2026-03-31' };
  const transactions = [];
  while (current.nextOn) {
    const result = prepareRecurringIncome(current, transactions, '2026-04-01');
    transactions.push(result.movement);
    current = { ...current, nextOn: result.next };
  }
  assert.deepEqual(transactions.map(t => t.date), ['2026-01-31','2026-02-28','2026-03-31']);
  assert.equal(new Set(transactions.map(t => t.recurringKey)).size, 3);
  const truncated = prepareRecurringIncome({ ...schedule, nextOn: '2026-02-28', endOn: '2026-03-30' }, [], '2026-04-01');
  assert.equal(truncated.next, null);
});

test('dos programas distintos no comparten claves de vencimiento', () => {
  const one = prepareRecurringIncome(schedule, [], '2026-01-31');
  const two = prepareRecurringIncome({ ...schedule, id: 'rent' }, [one.movement], '2026-01-31');
  assert.notEqual(one.movement.recurringKey, two.movement.recurringKey);
});
