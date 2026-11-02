export interface InvestmentAccount {
  account: string;
  capital: number;
  flowCapital?: number;
  flowAsOf?: string;
  asOf: string;
  annualRateBps: number;
  monthlyContribution: number;
  years: number;
}
export interface ProjectionRow { year: number; contributed: number; value: number; gain: number; }
export function projectAccount(capital: number, monthly: number, annualRateBps: number, years: number): ProjectionRow[] {
  if(!Number.isSafeInteger(capital)||capital<0||!Number.isSafeInteger(monthly)||monthly<0||!Number.isInteger(annualRateBps)||annualRateBps<=-10000||annualRateBps>10000||!Number.isInteger(years)||years<1||years>50)throw new Error('Revisa capital, aportación, rentabilidad (mayor de −100 % y hasta 100 %) y plazo (1–50 años).');
  const max=BigInt(Number.MAX_SAFE_INTEGER);
  if(BigInt(capital)+BigInt(monthly)*BigInt(years*12)>max)throw new Error('Las aportaciones superan el límite de cálculo.');
  const monthlyRate=Math.expm1(Math.log1p(annualRateBps/10000)/12);
  let value=capital;
  const rows:ProjectionRow[]=[{year:0,contributed:capital,value:capital,gain:0}];
  for(let month=1;month<=years*12;month++){
    value=value*(1+monthlyRate)+monthly;
    if(!Number.isFinite(value)||value>Number.MAX_SAFE_INTEGER)throw new Error('La proyección supera el límite de cálculo. Reduce el importe, tasa o plazo.');
    if(month%12===0){const contributed=capital+monthly*month,rounded=Math.round(value);rows.push({year:month/12,contributed,value:rounded,gain:rounded-contributed});}
  }
  return rows;
}
