import { SavingsTransferComponent } from './savings-transfer.component';
import { ActionGroupComponent } from './action-group.component';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Account, DemoStore } from './demo.store';
import { cents, euro, localDate, signedCents, validDate } from './money';
import { NgTemplateOutlet } from '@angular/common';
import { AccountPurposeComponent } from './account-purpose.component';
import { IndexStrategyComponent } from './index-strategy.component';
import { InvestmentAccount, projectAccount } from './account-projection';
import { AccountFormComponent } from './account-form.component';
import { estimateSavings } from './savings-math';
import { InvestmentTrade, investmentValue, position, scaledDecimal } from './investment-math';

@Component({selector:'app-finance',imports:[SavingsTransferComponent,ActionGroupComponent,RouterLink,ReactiveFormsModule,AccountFormComponent,NgTemplateOutlet,AccountPurposeComponent,IndexStrategyComponent],templateUrl:'./finance.component.html'})
export class FinanceComponent {
  readonly store=inject(DemoStore);
  readonly mode=input<'savings'|'investments'>('savings');
  readonly savings=computed(()=>this.mode()==='savings');
  readonly today=localDate();
  readonly month=this.today.slice(0,7)+'-01';
  readonly euro=euro;
  readonly message=signal('');
  readonly error=signal('');
  readonly savingsAccounts=computed(()=>this.store.accounts().filter(a=>a.purpose==='savings'||a.purpose==='hybrid'));
  readonly investmentAccountForm=new FormGroup({account:new FormControl('',{nonNullable:true}),capital:new FormControl('',{nonNullable:true}),asOf:new FormControl(localDate(),{nonNullable:true}),annualRate:new FormControl('',{nonNullable:true}),monthly:new FormControl('0,00',{nonNullable:true}),years:new FormControl(10,{nonNullable:true})});
  readonly selectedInvestment=signal('');
  readonly selectedProfile=computed<InvestmentAccount | undefined>(()=>this.store.investmentAccounts().find(p=>p.account===this.selectedInvestment())??this.store.investmentAccounts()[0]);
  readonly selectedSaving=signal('');
  readonly savingsProfile=computed<Account|undefined>(()=>this.savingsAccounts().find(a=>a.id===this.selectedSaving())??this.savingsAccounts()[0]);
  readonly activeProjectionProfile=computed<InvestmentAccount|undefined>(()=>{if(!this.savings()){const p=this.selectedProfile();return p?{...p,asOf:this.store.investmentDate(p)}:undefined;}const a=this.savingsProfile();return a?{account:a.id,capital:Math.max(0,this.store.savingsBalance(a)),asOf:this.today,annualRateBps:this.rates(a.id).find(r=>r.from<=this.today)?.taeBasisPoints??0,monthlyContribution:0,years:10}:undefined;});
  readonly projectionForm=new FormGroup({rate:new FormControl('',{nonNullable:true}),monthly:new FormControl('0,00',{nonNullable:true}),years:new FormControl(10,{nonNullable:true})});
  private readonly projectionInputs=toSignal(this.projectionForm.valueChanges,{initialValue:this.projectionForm.getRawValue()});
  readonly projection=computed(()=>{
    const profile=this.activeProjectionProfile(),inputs=this.projectionInputs();
    if(!profile)return {rows:[],error:''};
    const rate=signedCents(inputs.rate??''),monthly=signedCents(inputs.monthly??'');
    if(rate===null||monthly===null)return {rows:[],error:'Introduce una rentabilidad y aportación válidas, con hasta dos decimales.'};
    try{return {rows:projectAccount(this.savings()?profile.capital:this.store.investmentCapital(profile),monthly,rate,Number(inputs.years)),error:''};}catch(error){return {rows:[],error:error instanceof Error?error.message:'Revisa la proyección.'};}
  });
  readonly investmentTotal=computed(()=>this.safeTotal(this.store.investmentAccounts().map(p=>this.store.investmentCapital(p))));
  readonly projectionFinal=computed(()=>this.projection().rows.at(-1));
  readonly rateForm=new FormGroup({account:new FormControl('',{nonNullable:true}),tae:new FormControl('',{nonNullable:true}),from:new FormControl(localDate(),{nonNullable:true})});
  readonly paymentForm=new FormGroup({account:new FormControl('',{nonNullable:true}),amount:new FormControl('',{nonNullable:true}),date:new FormControl(localDate(),{nonNullable:true})});
  readonly instrumentForm=new FormGroup({name:new FormControl('',{nonNullable:true}),isin:new FormControl('',{nonNullable:true}),shareClass:new FormControl('',{nonNullable:true})});
  readonly tradeForm=new FormGroup({instrument:new FormControl('',{nonNullable:true}),kind:new FormControl<'buy'|'sell'>('buy',{nonNullable:true}),units:new FormControl('',{nonNullable:true}),price:new FormControl('',{nonNullable:true}),fees:new FormControl('0,00',{nonNullable:true}),account:new FormControl('',{nonNullable:true}),date:new FormControl(localDate(),{nonNullable:true})});
  readonly priceForm=new FormGroup({instrument:new FormControl('',{nonNullable:true}),price:new FormControl('',{nonNullable:true}),date:new FormControl(localDate(),{nonNullable:true}),source:new FormControl('',{nonNullable:true})});
  readonly savingsTransferTarget=signal('');
  readonly voidTarget=signal<InvestmentTrade|null>(null);
  readonly positions=computed(()=>this.store.instruments().map(instrument=>{
    const holding=position(this.store.investmentTrades(),instrument.id);
    const quote=this.store.investmentPrices().filter(p=>p.instrument===instrument.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
    let value:number|null=holding.units===0?0:null;
    if(holding.units>0&&quote){try{value=investmentValue(holding.units,quote.price);}catch{value=null;}}
    return {instrument,...holding,quote,value,unrealized:value===null?null:value-holding.cost};
  }));
  readonly knownValue=computed(()=>this.safeTotal(this.positions().map(p=>p.value??0)));
  readonly netWorth=computed(()=>{const value=this.knownValue();return value===null?null:this.safeTotal([this.store.total(),value]);});
  readonly missingPrices=computed(()=>this.positions().some(p=>p.units>0&&p.value===null));
  constructor(){
    effect(()=>{const p=this.savings()?undefined:this.selectedProfile();if(p)this.projectionForm.reset({rate:this.decimal(p.annualRateBps),monthly:this.decimal(p.monthlyContribution),years:p.years});});
    effect(()=>{if(this.savings()){const a=this.savingsProfile();if(a){const rate=this.store.savingsRates().filter(r=>r.account===a.id&&r.from<=this.today).sort((a,b)=>b.from.localeCompare(a.from))[0];const scenario=this.store.savingsScenarios().find(s=>s.account===a.id);this.projectionForm.reset({rate:this.decimal(scenario?.annualRateBps??rate?.taeBasisPoints??0),monthly:this.decimal(scenario?.monthlyContribution??this.store.plannedMonthly(a.id,'savings')??0),years:scenario?.years??10});}}});
    effect(()=>{const account=this.store.preferredAccount();this.rateForm.controls.account.setValue(account);this.paymentForm.controls.account.setValue(account);this.tradeForm.controls.account.setValue(account);this.investmentAccountForm.controls.account.setValue(account);});}
  accountCash(id:string):number{const account=this.store.accounts().find(a=>a.id===id);return account?this.store.balance(account):0;}
  accountCreated(id:string,creation:HTMLDialogElement,rate:HTMLDialogElement,investment:HTMLDialogElement):void {
    creation.close();if(this.savings()){this.rateForm.controls.account.setValue(id);this.open(rate);}else{this.investmentAccountForm.controls.account.setValue(id);this.open(investment);}
  }
  savingsProjection(id:string,months:number):number|null {
    const a=this.store.accounts().find(a=>a.id===id),r=this.rates(id).find(r=>r.from<=this.today);
    if(!a||!r)return null;const result=Math.max(0,this.store.savingsBalance(a)) * Math.expm1(Math.log1p(r.taeBasisPoints/10000)*months/12);
    return Number.isSafeInteger(Math.round(result))?Math.round(result):null;
  }
  decimal(cents:number):string{return `${cents<0?'-':''}${Math.floor(Math.abs(cents)/100)},${String(Math.abs(cents)%100).padStart(2,'0')}`;}
  editInvestment(profile:InvestmentAccount|undefined,dialog:HTMLDialogElement):void {
    this.investmentAccountForm.reset({account:profile?.account??this.store.preferredAccount(),capital:profile?this.decimal(this.store.investmentCapital(profile)):'',asOf:profile?this.store.investmentDate(profile):localDate(),annualRate:profile?this.decimal(profile.annualRateBps):'',monthly:profile?this.decimal(profile.monthlyContribution):'0,00',years:profile?.years??10});this.open(dialog);
  }
  saveInvestmentAccount(dialog:HTMLDialogElement):void {
    const v=this.investmentAccountForm.getRawValue(),capital=signedCents(v.capital),monthly=signedCents(v.monthly),rate=signedCents(v.annualRate);
    if(capital===null||monthly===null||rate===null){this.error.set('Revisa el importe invertido, la aportación y tu rentabilidad supuesta.');return;}
    if(this.result(this.store.saveInvestmentAccount({account:v.account,capital,asOf:v.asOf,monthlyContribution:monthly,annualRateBps:rate,years:Number(v.years)}),dialog,'Cuenta de inversión actualizada. Los saldos reales no cambian.')){this.selectedInvestment.set(v.account);const a=this.store.accounts().find(a=>a.id===v.account);if(a&&(!a.purpose||a.purpose==='cash'))this.store.configurePurpose(a.id,'investment',0);}
  }
  plannedContribution():number|null {const p=this.activeProjectionProfile();return p?this.store.plannedMonthly(p.account,this.savings()?'savings':'investment'):0;}
  usePlannedContribution():void {const amount=this.plannedContribution();if(amount!==null)this.projectionForm.controls.monthly.setValue(this.decimal(amount));}
  saveScenario():void {
    if(this.savings()){const a=this.savingsProfile(),v=this.projectionForm.getRawValue(),rate=signedCents(v.rate),monthly=signedCents(v.monthly);if(!a||rate===null||monthly===null)return;const error=this.store.saveSavingsScenario(a.id,rate,monthly,Number(v.years));this.message.set(error??'Hipótesis de ahorro guardadas en la demo, sin modificar saldos ni la TAE real.');return;}
    const p=this.selectedProfile(),v=this.projectionForm.getRawValue(),rate=signedCents(v.rate),monthly=signedCents(v.monthly);
    if(!p||rate===null||monthly===null||this.projection().error)return;
    const error=this.store.saveInvestmentAccount({...p,annualRateBps:rate,monthlyContribution:monthly,years:Number(v.years)});
    this.message.set(error??'Hipótesis guardadas para esta cuenta en la demo.');
  }
  projectionPoints(field:'value'|'contributed'):string {
    const rows=this.projection().rows,max=Math.max(1,...rows.flatMap(r=>[r.value,r.contributed]));
    return rows.map((r,i)=>`${20+(i/Math.max(1,rows.length-1))*560},${200-r[field]/max*180}`).join(' ');
  }
  safeTotal(values: number[]):number|null{const total=values.reduce((sum,n)=>sum+BigInt(n),0n);return total<=BigInt(Number.MAX_SAFE_INTEGER)&&total>=BigInt(Number.MIN_SAFE_INTEGER)?Number(total):null;}
  count(value:number):string{return new Intl.NumberFormat('es-ES',{maximumFractionDigits:6}).format(value/1e6);}
  instrumentName(id:string):string{return this.store.instruments().find(i=>i.id===id)?.name??'';}
  rates(id:string){return this.store.savingsRates().filter(r=>r.account===id).sort((a,b)=>b.from.localeCompare(a.from));}
  currentTae(id:string):string {const r=this.rates(id).find(r=>r.from<=this.today);return r?`${(r.taeBasisPoints/100).toLocaleString('es-ES')} % TAE`:'Tasa futura';}
  estimate(id:string):number {const a=this.store.accounts().find(a=>a.id===id)!;const transactions=this.store.transactions().filter(t=>!t.voidedAt).flatMap(t=>{let amount=0;if(t.account===id&&(t.sourcePocket??this.store.defaultPocket(id))==='savings')amount+=t.amount;if(t.kind==='transfer'&&t.destination===id&&(t.destinationPocket??this.store.defaultPocket(id))==='savings')amount-=t.amount;return amount?[{...t,kind:amount<0?'income' as const:'expense' as const,account:id,destination:undefined,amount}]:[];});return estimateSavings({...a,initial:a.purpose==='hybrid'?(a.savingsOffset??0):a.initial},transactions,this.store.savingsRates(),this.month,this.today);}
  paid(id:string):number{return this.store.transactions().filter(t=>!t.voidedAt&&t.kind==='income'&&t.category==='Intereses abonados'&&t.account===id&&t.date>=this.month&&t.date<=this.today).reduce((sum,t)=>sum-t.amount,0);}
  lastTrade(id:string):string{return this.store.investmentTrades().filter(t=>t.instrument===id&&!t.voided).reduce((last,t)=>t.date>last?t.date:last,'');}
  open(dialog:HTMLDialogElement):void{this.error.set('');dialog.showModal();}
  result(error:string|null,dialog:HTMLDialogElement,text:string):boolean {if(error){this.error.set(error);return false;}dialog.close();this.message.set(text);return true;}
  addRate(dialog:HTMLDialogElement):void{const v=this.rateForm.getRawValue(),tae=signedCents(v.tae);if(tae===null){this.error.set('Introduce una TAE con hasta dos decimales.');return;}if(this.result(this.store.addSavingsRate(v.account,v.from,tae),dialog,'Tasa guardada. El saldo no cambia.')){const a=this.store.accounts().find(a=>a.id===v.account);if(a&&(!a.purpose||a.purpose==='cash'))this.store.configurePurpose(a.id,'savings',0);this.rateForm.controls.tae.reset();}}
  addPayment(dialog:HTMLDialogElement):void{
    const v=this.paymentForm.getRawValue(),amount=cents(v.amount);
    if(!amount||!validDate(v.date)||v.date>localDate()){this.error.set('Revisa el importe y una fecha no futura.');return;}
    if(this.result(this.store.recordMovement({kind:'income',concept:'Intereses abonados',category:'Intereses abonados',sourcePocket:'savings',amount:-amount,account:v.account,date:v.date}),dialog,'Abono real registrado como ingreso.'))this.paymentForm.controls.amount.reset();
  }
  addInstrument(dialog:HTMLDialogElement):void{const v=this.instrumentForm.getRawValue();if(this.result(this.store.addInstrument(v.name,v.isin,v.shareClass),dialog,'Instrumento añadido sin saldo ni cotización inventados.'))this.instrumentForm.reset();}
  addTrade(dialog:HTMLDialogElement):void{
    const v=this.tradeForm.getRawValue(),units=scaledDecimal(v.units,6),price=scaledDecimal(v.price,6),fees=signedCents(v.fees);
    if(!units||!price||fees===null||fees<0){this.error.set('Participaciones y precio: hasta seis decimales; comisiones: hasta dos.');return;}
    if(this.result(this.store.addInvestmentTrade({...v,units,price,fees}),dialog,'Operación registrada. Efectivo y participaciones actualizados.')){this.tradeForm.controls.units.reset();this.tradeForm.controls.price.reset();this.tradeForm.controls.fees.reset();}
  }
  addPrice(dialog:HTMLDialogElement):void{const v=this.priceForm.getRawValue(),price=scaledDecimal(v.price,6);if(!price){this.error.set('Introduce un valor positivo con hasta seis decimales.');return;}if(this.result(this.store.addInvestmentPrice({...v,price}),dialog,'Valor manual guardado con fecha y fuente.')){this.priceForm.controls.price.reset();}}
  confirmVoid(dialog:HTMLDialogElement):void{const t=this.voidTarget();if(t)this.result(this.store.voidInvestmentTrade(t.id),dialog,'Operación anulada y efectivo corregido.');}
}
