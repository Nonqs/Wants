import type { LedgerAccount, Transaction } from './demo-ledger';
export interface SavingsRate { id: string; account: string; from: string; taeBasisPoints: number; }
// ACT/365 fixed. Estimate on actual closing balances, without virtual credits.
export function estimateSavings(account: LedgerAccount, transactions: readonly Transaction[], rates: readonly SavingsRate[], from: string, until: string): number {
  let result=0;
  const date=new Date(`${from}T12:00:00Z`), end=new Date(`${until}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(end.getTime()) || end.getTime()-date.getTime()>366*86400000) return 0;
  for (;date<end;date.setUTCDate(date.getUTCDate()+1)) {
    const day=date.toISOString().slice(0,10);
    if(day<account.openedOn)continue;
    const rate=rates.filter(r=>r.account===account.id&&r.from<=day).sort((a,b)=>b.from.localeCompare(a.from))[0];
    if(!rate)continue;
    const balance=transactions.filter(t=>!t.voidedAt&&t.date<=day).reduce((sum,t)=>sum-(t.account===account.id?t.amount:0)+(t.kind==='transfer'&&t.destination===account.id?t.amount:0),account.initial);
    result+=Math.max(0,balance)*Math.expm1(Math.log1p(rate.taeBasisPoints/10000)/365);
  }
  return Math.round(result);
}
