import type { IncomeSplit, Pocket } from './money-flow';
import type { Transaction } from './demo-ledger';

export interface RecurringIncome {
  id: string;
  concept: string;
  amount: number;
  account: string;
  startOn: string;
  endOn: string;
  nextOn: string | null;
  enabled: boolean;
  pocket?:Pocket;
  splits?:IncomeSplit[];
}

// Keep the original day: Jan 31 -> Feb 28/29 -> Mar 31.
export function nextMonthlyDate(startOn: string, current: string): string | null {
  const day = Number(startOn.slice(8,10));
  const currentMonth = Number(current.slice(5,7));
  const month = currentMonth === 12 ? 1 : currentMonth + 1;
  const year = Number(current.slice(0,4)) + (currentMonth === 12 ? 1 : 0);
  if (year > 9999) return null;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`;
}

export function prepareRecurringIncome(schedule: RecurringIncome, transactions: readonly Transaction[], today: string): { next: string | null; movement: Transaction | null } | null {
  if (!schedule.enabled || !schedule.nextOn || schedule.nextOn > today || (schedule.endOn && schedule.nextOn > schedule.endOn)) return null;
  const key = `${schedule.id}:${schedule.nextOn}`;
  let next = nextMonthlyDate(schedule.startOn, schedule.nextOn);
  if (schedule.endOn && next && next > schedule.endOn) next = null;
  return {
    next,
    movement: transactions.some(t => t.recurringKey === key) ? null : {
      kind: 'income', concept: schedule.concept, amount: -schedule.amount,
      category: 'Ingreso recurrente', account: schedule.account,
      date: schedule.nextOn, recurringKey: key, sourcePocket: schedule.pocket
    }
  };
}
