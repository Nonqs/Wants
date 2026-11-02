import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DemoStore, Transaction } from './demo.store';
import { Pocket } from './money-flow';
import { cents } from './money';

@Component({
  selector: 'app-edit-movement',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <h2>Editar {{ movement().kind === 'transfer' ? 'transferencia' : movement().kind === 'income' ? 'ingreso' : 'gasto' }}</h2>
      <p class="muted">Los saldos se recalculan con la operación corregida.</p>
      @if (movement().recurringKey) {<div class="info-strip">Solo cambia este ingreso. El programa recurrente conserva su importe y fechas.</div>}
      <label>Concepto<input formControlName="concept" maxlength="100"></label>
      <label>Importe (€)<input formControlName="amount" inputmode="decimal"></label>
      <label>{{ movement().kind === 'transfer' ? 'Cuenta de origen' : 'Cuenta' }}<select formControlName="account">@for (a of store.accounts(); track a.id) {<option [value]="a.id">{{ a.name }}</option>}</select></label>
      <label>Bolsillo de la cuenta<select formControlName="sourcePocket"><option value="cash">Efectivo</option><option value="savings">Ahorro</option></select></label>
      @if (movement().kind === 'transfer') {<label>Cuenta de destino<select formControlName="destination">@for (a of store.accounts(); track a.id) {<option [value]="a.id" [disabled]="a.id === form.controls.account.value">{{ a.name }}</option>}</select></label><label>Bolsillo de destino<select formControlName="destinationPocket"><option value="cash">Efectivo</option><option value="savings">Ahorro</option></select></label>}
      @if (movement().kind === 'expense' || movement().kind === 'income') {<label>Categoría<input formControlName="category" maxlength="60"></label>}
      <label>Fecha<input type="date" formControlName="date"></label>
      <label>Notas<textarea formControlName="notes" maxlength="500" rows="2"></textarea></label>
      <p class="error" role="alert">{{ error }}</p><button class="button primary wide" type="submit">Guardar cambios de ejemplo</button><p class="form-note">Demo temporal · Los cambios se pierden al recargar.</p>
    </form>
  `
})
export class EditMovementComponent {
  readonly store = inject(DemoStore);
  readonly movement = input.required<Transaction>();
  readonly saved = output<void>();
  readonly form = new FormGroup({
    sourcePocket:new FormControl<Pocket>('cash',{nonNullable:true}),destinationPocket:new FormControl<Pocket>('cash',{nonNullable:true}),
    concept: new FormControl('', { nonNullable: true, validators: [Validators.required,Validators.maxLength(100)] }),
    amount: new FormControl('', { nonNullable: true }),
    account: new FormControl('', { nonNullable: true }),
    destination: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required,Validators.maxLength(60)] }),
    date: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] })
  });
  error = '';
  constructor() {
    effect(() => {
      const t=this.movement(), amount=Math.abs(t.amount);
      this.form.reset({sourcePocket:t.sourcePocket??this.store.defaultPocket(t.account),destinationPocket:t.destinationPocket??(t.destination?this.store.defaultPocket(t.destination):'cash'), concept:t.concept, amount:`${Math.floor(amount/100)},${String(amount%100).padStart(2,'0')}`,
        account:t.account, destination:t.destination ?? '', category:t.category, date:t.date, notes:t.notes ?? '' });
      this.error='';
    });
  }
  save(): void {
    const value=this.form.getRawValue(), amount=cents(value.amount), original=this.movement();
    if (this.form.invalid || !amount || !original.id) { this.error='Revisa el concepto, el importe positivo, la categoría y las notas.'; return; }
    const error=this.store.updateMovement(original.id,{ ...value, amount:original.kind==='income' ? -amount : amount });
    if (error) { this.error=error; return; }
    this.saved.emit();
  }
}
