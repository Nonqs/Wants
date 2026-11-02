import type { Transaction, LedgerAccount } from './demo-ledger';
export type Pocket='cash'|'savings';
export type Purpose='cash'|'savings'|'hybrid'|'investment';
export interface PurposeAccount extends LedgerAccount { purpose?:Purpose; savingsOffset?:number; }
export interface IncomeSplit { account:string; pocket:Pocket|'investment'; percentBps:number; }
export interface StrategyFund { id:string; name:string; isin:string; weightBps:number; }
export interface IndexStrategy { account:string; funds:StrategyFund[]; }
export interface FundAllocation { id:string; account:string; fund:string; name:string; isin:string; amount:number; date:string; flowKey:string; }
export function defaultPocket(account:PurposeAccount):Pocket{return account.purpose==='savings'?'savings':'cash';}
export function savingsBalance(account:PurposeAccount,transactions:readonly Transaction[]):number {
  if(account.purpose==='savings')return transactions.filter(t=>!t.voidedAt).reduce((sum,t)=>sum-(t.account===account.id?t.amount:0)+(t.kind==='transfer'&&t.destination===account.id?t.amount:0),account.initial);
  if(account.purpose!=='hybrid')return 0;
  return transactions.filter(t=>!t.voidedAt).reduce((sum,t)=>sum-(t.account===account.id&&t.sourcePocket==='savings'?t.amount:0)+(t.kind==='transfer'&&t.destination===account.id&&t.destinationPocket==='savings'?t.amount:0),account.savingsOffset??0);
}
// Unassigned percentage remains at source. Largest remainders preserve cents.
export function splitAmount(amount:number,weights:readonly number[],requireFull=false):{parts:number[];remaining:number}{
  const total=weights.reduce((sum,n)=>sum+n,0);
  if(!Number.isSafeInteger(amount)||amount<0||weights.some(n=>!Number.isInteger(n)||n<=0||n>10000)||total>10000||(requireFull&&total!==10000))throw new Error(requireFull?'Los porcentajes de fondos deben sumar 100 %.':'El reparto debe sumar como máximo 100 %, con porcentajes positivos.');
  const numerators=weights.map(n=>BigInt(amount)*BigInt(n));
  const parts=numerators.map(n=>Number(n/10000n));
  const budget=Number(BigInt(amount)*BigInt(total)/10000n);
  let remainder=budget-parts.reduce((a,b)=>a+b,0);
  const order=numerators.map((n,i)=>({i,r:n%10000n})).sort((a,b)=>a.r===b.r?a.i-b.i:a.r>b.r?-1:1);
  for(const n of order){if(!remainder)break;parts[n.i]++;remainder--;}
  return {parts,remaining:amount-budget};
}
