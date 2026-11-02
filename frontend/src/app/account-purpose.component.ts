import { Component, effect, inject, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Account, DemoStore } from './demo.store';
import { Purpose } from './money-flow';
import { signedCents } from './money';
@Component({selector:'app-account-purpose',imports:[ReactiveFormsModule],template:`
<button class="button subtle" (click)="error='';dialog.showModal()">Propósito</button>
<dialog #dialog aria-label="Propósito de la cuenta"><div class="dialog-heading"><span class="eyebrow">CADA CUENTA, SU FUNCIÓN</span><button type="button" class="icon-button" (click)="dialog.close()" aria-label="Cerrar">✕</button></div><form [formGroup]="form" (ngSubmit)="save(dialog)"><h2>{{ account().name }}</h2><label>Uso de la cuenta<select formControlName="purpose"><option value="cash">Efectivo para el día a día</option><option value="savings">Solo ahorro</option><option value="hybrid">Híbrida: efectivo y ahorro</option><option value="investment">Solo inversión</option></select></label>@if(form.controls.purpose.value==='hybrid'){<label>Ahorro actual dentro de esta cuenta (€)<input formControlName="savings" inputmode="decimal"></label>}<p class="field-help">Clasifica el saldo existente; no ingresa ni transfiere dinero. Solo el efectivo de cuentas de día a día e híbridas queda disponible para gastos y deseos.</p><p class="error" role="alert">{{error}}</p><button class="button primary wide">Guardar propósito</button></form></dialog>`})
export class AccountPurposeComponent {
 readonly store=inject(DemoStore);readonly account=input.required<Account>();
 readonly form=new FormGroup({purpose:new FormControl<Purpose>('cash',{nonNullable:true}),savings:new FormControl('0,00',{nonNullable:true})});error='';
 constructor(){effect(()=>{const a=this.account(),n=this.store.savingsBalance(a);this.form.reset({purpose:a.purpose??'cash',savings:`${Math.floor(Math.max(0,n)/100)},${String(Math.max(0,n)%100).padStart(2,'0')}`});});}
 save(dialog:HTMLDialogElement):void{const v=this.form.getRawValue(),n=signedCents(v.savings);if(n===null){this.error='Revisa el importe de ahorro.';return;}const error=this.store.configurePurpose(this.account().id,v.purpose,n);if(error){this.error=error;return;}dialog.close();}
}
