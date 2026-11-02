import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DemoStore, Wish } from './demo.store';
import { cents, euro, localDate } from './money';
import { AccountFormComponent } from './account-form.component';

@Component({
  selector: 'app-wish-purchase', imports: [ReactiveFormsModule,AccountFormComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()"><h2>He comprado «{{ wish().name }}»</h2><p class="muted">Registra la compra o vincúlala a un gasto que ya hayas añadido.</p>
      <label>Registro del gasto<select formControlName="mode"><option value="new">Crear un gasto de compra</option><option value="existing">Ya lo registré en Gastos</option></select></label>
      @if (form.controls.mode.value === 'new') {
        @if (!store.accounts().length) {<div class="info-strip">Crea primero una cuenta.</div>}
        <label>Precio pagado (€)<input formControlName="amount" inputmode="decimal"></label>
        <label>Cuenta<select formControlName="account">@for (a of store.accounts(); track a.id) {<option [value]="a.id">{{ a.name }}</option>}</select></label>
        <label>Fecha de compra<input type="date" formControlName="date" [max]="today"></label>
      } @else {
        <label>Gasto existente<select formControlName="expense"><option value="">Selecciona un gasto</option>@for (t of expenses(); track t.id) {<option [value]="t.id">{{ t.date }} · {{ t.concept }} · {{ euro(t.amount) }}</option>}</select></label>
        @if (!expenses().length) {<p class="field-help">No hay gastos disponibles. Registra uno nuevo o cierra este diálogo.</p>}
      }
      <div class="info-strip">Reserva actual: {{ euro(wish().saved) }}. La parte utilizada deja de estar reservada; si sobra, vuelve al pendiente del fondo. Si el precio es mayor, la diferencia sale del saldo sin reservar.</div>
      <p class="error" role="alert">{{ error }}</p><button class="button primary wide" type="submit" [disabled]="form.controls.mode.value === 'new' && !store.accounts().length">Confirmar compra de ejemplo</button><p class="form-note">No se realiza ninguna compra real. Solo se registra en esta demo temporal.</p>
    </form>
    @if (!store.accounts().length && form.controls.mode.value === 'new') {<app-account-form />}
  `
})
export class WishPurchaseComponent {
  readonly store=inject(DemoStore);
  readonly wish=input.required<Wish>();
  readonly saved=output<void>();
  readonly euro=euro;
  readonly today=localDate();
  readonly expenses=computed(()=>this.store.transactions().filter(t=>t.kind==='expense' && !t.voidedAt && t.date<=this.today && !this.store.wishes().some(w=>w.purchaseTransactionId===t.id)));
  readonly form=new FormGroup({mode:new FormControl('new',{nonNullable:true}),amount:new FormControl('',{nonNullable:true}),account:new FormControl('',{nonNullable:true}),date:new FormControl(localDate(),{nonNullable:true}),expense:new FormControl('',{nonNullable:true})});
  error='';
  constructor() {
    effect(()=>{const w=this.wish();this.form.reset({mode:'new',amount:`${Math.floor(w.price/100)},${String(w.price%100).padStart(2,'0')}`,account:this.store.preferredAccount(),date:localDate(),expense:''});this.error='';});
  }
  save():void {
    const value=this.form.getRawValue(),amount=cents(value.amount),existing=value.mode==='existing';
    if ((!existing && !amount) || (existing && !value.expense)) {this.error='Revisa el precio pagado o selecciona el gasto existente.';return;}
    const error=this.store.buyWish(this.wish().id,amount ?? 0,value.account,value.date,existing?value.expense:'');
    if(error){this.error=error;return;}this.saved.emit();
  }
}
