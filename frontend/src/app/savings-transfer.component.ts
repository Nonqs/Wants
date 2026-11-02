import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DemoStore } from './demo.store';
import { Pocket } from './money-flow';
import { cents, euro, localDate, validDate } from './money';

@Component({selector:'app-savings-transfer',imports:[ReactiveFormsModule],template:`
<form [formGroup]="form" (ngSubmit)="save()">
  <h2>Aportar al ahorro</h2><p class="muted">Mueve dinero de otra cuenta propia. Se descuenta del origen y se suma al ahorro, sin crear un ingreso.</p>
  <label>Cuenta de origen<select formControlName="source"><option value="">Selecciona una cuenta</option>@for(a of sources();track a.id){<option [value]="a.id">{{a.name}}</option>}</select></label>
  @if(sourceAccount()?.purpose==='hybrid'){<label>Retirar de<select formControlName="pocket"><option value="cash">Efectivo</option><option value="savings">Ahorro</option></select></label>}
  <p class="field-help">Disponible en origen: <strong>{{euro(available())}}</strong></p>
  <label>Cuenta de ahorro de destino<select formControlName="destination"><option value="">Selecciona una cuenta</option>@for(a of destinations();track a.id){<option [value]="a.id" [disabled]="a.id===form.controls.source.value">{{a.name}}</option>}</select></label>
  <p class="field-help">El destino será siempre el bolsillo de ahorro.</p>
  <label>Importe a transferir (€)<input formControlName="amount" inputmode="decimal" maxlength="18" placeholder="20,00" [attr.aria-invalid]="values().amount && amountError() ? 'true' : null" aria-describedby="saving-amount-error"></label>
  <p id="saving-amount-error" class="error" role="status">{{values().amount ? amountError() : ''}}</p>
  <label>Fecha<input type="date" formControlName="date" [max]="today"></label>
  <p class="error" role="alert">{{error}}</p>
  @if(!sources().length){<p class="field-help">Necesitas otra cuenta de origen con saldo disponible para aportar al ahorro.</p>}
  <button class="button primary wide" type="submit" [disabled]="!canSave()">Transferir al ahorro</button><p class="form-note">Demo temporal · Se registran ambos lados a la vez. No se ordena una transferencia bancaria real.</p>
</form>`})
export class SavingsTransferComponent {
 readonly store=inject(DemoStore);readonly destination=input('');readonly saved=output<void>();readonly euro=euro;readonly today=localDate();
 readonly form=new FormGroup({source:new FormControl('',{nonNullable:true}),destination:new FormControl('',{nonNullable:true}),pocket:new FormControl<Pocket>('cash',{nonNullable:true}),amount:new FormControl('',{nonNullable:true}),date:new FormControl(localDate(),{nonNullable:true})});
 readonly values=toSignal(this.form.valueChanges,{initialValue:this.form.getRawValue()});
 readonly sources=computed(()=>this.store.accounts().filter(a=>a.id!==this.values().destination));
 readonly destinations=computed(()=>this.store.accounts().filter(a=>a.purpose==='savings'||a.purpose==='hybrid'));
 readonly sourceAccount=computed(()=>this.store.accounts().find(a=>a.id===this.values().source));
 readonly available=computed(()=>{const a=this.sourceAccount(),v=this.values();return a?Math.max(0,this.store.availablePocket(a.id,v.pocket??'cash',v.date??localDate())):0;});
 readonly amountError=computed(()=>{const amount=cents(this.values().amount??'');if(!amount)return 'Introduce un importe positivo con hasta dos decimales, dentro del límite de cálculo.';if(amount>this.available())return `No puedes transferir más de ${euro(this.available())}.`;return '';});
 readonly canSave=computed(()=>{const v=this.values();return !!v.source&&!!v.destination&&v.source!==v.destination&&!this.amountError()&&validDate(v.date??'')&&(v.date??'')<=localDate();});
 error='';
 constructor(){
  this.form.controls.source.valueChanges.subscribe(id=>this.form.controls.pocket.setValue(this.store.defaultPocket(id)));
  effect(()=>{const destination=this.destination()||this.destinations()[0]?.id||'',source=this.store.accounts().find(a=>a.id===this.store.preferredAccount()&&a.id!==destination)?.id??this.store.accounts().find(a=>a.id!==destination)?.id??'';this.form.reset({source,destination,pocket:this.store.defaultPocket(source),amount:'',date:localDate()});this.error='';});
 }
 save():void{const v=this.form.getRawValue(),amount=cents(v.amount);if(!this.canSave()||!amount){this.error=this.amountError()||'Selecciona dos cuentas distintas y una fecha válida.';return;}const error=this.store.contributeSavings(v.source,v.destination,amount,v.pocket,v.date);if(error){this.error=error;return;}this.form.controls.amount.reset();this.saved.emit();}
}
