import { Component, effect, inject, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { cents, DemoStore, localDate } from './demo.store';
import { validDate } from './money';
import { AccountFormComponent } from './account-form.component';

@Component({
  selector: 'app-expense-form',
  imports: [ReactiveFormsModule, AccountFormComponent],
  template: `
    @if (!store.accounts().filter(spendable).length) {
      <div class="info-strip">Primero crea una cuenta para saber de dónde sale el gasto.</div>
      <app-account-form />
    } @else {
    <form [formGroup]="form" (ngSubmit)="save()">
      <h2>Añadir gasto</h2><p class="muted">Las pequeñas cosas también cuentan.</p>
      <label>Concepto<input formControlName="concept" placeholder="Por ejemplo, Café" maxlength="100" autocomplete="off"></label>
      <label>Importe (€)<input formControlName="amount" placeholder="2,50" inputmode="decimal"></label>
      <p class="field-help">Se descontará de {{ store.accountName(form.controls.account.value) }}.</p>
      <details><summary>Más opciones <span>Cuenta, categoría, fecha</span></summary>
        <label>Cuenta<select formControlName="account">@for (a of store.accounts().filter(spendable); track a.id) {<option [value]="a.id">{{ a.name }} · {{ a.subtitle }}</option>}</select></label>
        <label>Categoría<select formControlName="category">@for (category of categories; track category) {<option>{{ category }}</option>}</select></label>
        <label>Fecha<input type="date" formControlName="date"></label>
        <label>Notas<textarea rows="2" formControlName="notes" maxlength="500"></textarea></label>
      </details>
      <p class="error" role="alert">{{ error }}</p>
      <button class="button primary wide" type="submit">Guardar gasto de ejemplo</button>
      <p class="form-note">Demo local · No se guarda en MySQL.</p>
    </form>
    }
  `
})
export class ExpenseFormComponent {
  readonly store = inject(DemoStore);
  readonly saved = output<void>();
  readonly categories = ['Sin categorizar', 'Comida', 'Transporte', 'Ocio', 'Compras', 'Suscripciones'];
  readonly form = new FormGroup({
    concept: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    amount: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    account: new FormControl(this.store.preferredAccount(), { nonNullable: true }),
    category: new FormControl('Sin categorizar', { nonNullable: true }),
    date: new FormControl(localDate(), { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] })
  });
  readonly spendable=(a: {purpose?:string})=>a.purpose!=='savings'&&a.purpose!=='investment';
  error = '';
  constructor() {
    effect(() => this.form.controls.account.setValue(this.store.preferredAccount()));
  }
  save(): void {
    const value = this.form.getRawValue();
    const amount = cents(value.amount);
    if (this.form.invalid || !amount || !value.concept.trim()) {
      this.error = 'Escribe un concepto, un importe positivo con hasta dos decimales y una fecha válida.';
      return;
    }
    if (!validDate(value.date) || !this.store.accounts().some(a => a.id === value.account)) {
      this.error = 'Revisa la cuenta y la fecha.';
      return;
    }
    const account = this.store.accounts().find(a => a.id === value.account)!;
    if (value.date < account.openedOn) {
      this.error = 'La fecha del gasto debe ser igual o posterior a la fecha del saldo inicial.'; return;
    }
    if(!this.spendable(account)){this.error='Selecciona una cuenta con efectivo para gastos.';return;}
    const error = this.store.recordMovement({ ...value, kind: 'expense', sourcePocket:'cash', amount });
    if (error) { this.error = error; return; }
    this.store.lastAccount.set(value.account);
    this.form.reset({ concept: '', amount: '', account: value.account, category: 'Sin categorizar', date: localDate(), notes: '' });
    this.error = '';
    this.store.notify('Gasto añadido a la demo. Se perderá al recargar.');
    this.saved.emit();
  }
}
