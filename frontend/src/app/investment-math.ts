export interface Instrument { id: string; name: string; isin: string; shareClass: string; currency: 'EUR'; }
export interface InvestmentTrade { id: string; instrument: string; kind: 'buy'|'sell'; units: number; price: number; fees: number; date: string; account: string; movementId: string; voided?: boolean; }
export interface InvestmentPrice { instrument: string; price: number; date: string; source: string; }
export function scaledDecimal(raw: string, decimals: number): number | null {
  const match=raw.trim().match(new RegExp(`^(\\d+)(?:[,.](\\d{1,${decimals}}))?$`));
  if(!match)return null;
  const value=BigInt(match[1])*10n**BigInt(decimals)+BigInt((match[2]??'').padEnd(decimals,'0'));
  return value>0n&&value<=BigInt(Number.MAX_SAFE_INTEGER)?Number(value):null;
}
export function validIsin(isin: string): boolean {
  if(!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin))return false;
  const digits=[...isin].map(c=>/\d/.test(c)?c:String(c.charCodeAt(0)-55)).join('');
  let sum=0;
  for(let i=digits.length-1,alternate=false;i>=0;i--,alternate=!alternate){let n=Number(digits[i]);if(alternate){n*=2;if(n>9)n-=9;}sum+=n;}
  return sum%10===0;
}
// units and unit price use six decimals. Convert EUR to cents exactly.
export function investmentValue(units: number, price: number): number {
  const value=(BigInt(units)*BigInt(price)+5_000_000_000n)/10_000_000_000n;
  if(value>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('El valor supera el límite de esta demo.');
  return Number(value);
}
export function position(trades: readonly InvestmentTrade[], instrument: string): { units:number; cost:number; realized:number } {
  let units=0,cost=0,realized=0;
  const ordered=trades.filter(t=>!t.voided&&t.instrument===instrument).sort((a,b)=>a.date.localeCompare(b.date));
  for(const t of ordered){const gross=investmentValue(t.units,t.price);if(t.kind==='buy'){units+=t.units;cost+=gross+t.fees;}else{
    if(t.units>units)throw new Error('No hay participaciones suficientes en esa fecha.');
    const removed=t.units===units?cost:Number((BigInt(cost)*BigInt(t.units)+BigInt(Math.floor(units/2)))/BigInt(units));
    realized+=gross-t.fees-removed;cost-=removed;units-=t.units;
  }
  if(![units,cost,realized].every(Number.isSafeInteger))throw new Error('La posición supera el límite de esta demo.');
  }
  return {units,cost,realized};
}
