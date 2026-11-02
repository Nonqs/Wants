import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DemoStore } from './demo.store';
import { cents, euro, localDate } from './money';
import { Pocket } from './money-flow';
import { AccountFormComponent } from './account-form.component';

@Component({
  selector: 'app-movement-form',
  imports: [ReactiveFormsModule, AccountFormComponent],
  template: `
    @if (store.accounts().length < (kind() === 'transfer' ? 2 : 1)) {
      <div class="info-strip">{{ kind() === 'transfer' ? 'Necesitas dos cuentas para mover dinero entre ellas.' : 'Crea primero la cuenta que recibirá el ingreso.' }}</div>
      <app-account-form />
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ kind() === 'transfer' ? 'Transferir entre mis cuentas' : 'Añadir ingreso' }}</h2>
        <p class="muted">{{ kind() === 'transfer' ? 'Tu dinero cambia de sitio. Tu saldo total sigue igual.' : 'Registra el dinero que ha llegado a tu cuenta.' }}</p>
        <label>Concepto<input formControlName="concept" maxlength="100" [placeholder]="kind() === 'transfer' ? 'Por ejemplo, Ahorro del mes' : 'Por ejemplo, Nómina'" autocomplete="off"></label>
        <label>Importe (€)<input formControlName="amount" inputmode="decimal" placeholder="20,00"></label>
        <label>{{ kind() === 'transfer' ? 'Cuenta de origen' : 'Cuenta de destino' }}
          <select formControlName="account">@for (a of store.accounts(); track a.id) {<option [value]="a.id">{{ a.name }}</option>}</select>
        </label>
        <label>Origen o destino del importe<select formControlName="sourcePocket"><option value="cash">Efectivo</option><option value="savings">Ahorro</option></select></label>
        @if (kind() === 'transfer') {
          <label>Cuenta de destino<select formControlName="destination"><option value="" disabled>Selecciona una cuenta</option>@for (a of store.accounts(); track a.id) {@if (a.id !== form.controls.account.value) {<option [value]="a.id">{{ a.name }}</option>}}</select></label>
          <label>Depositar en<select formControlName="destinationPocket"><option value="cash">Efectivo del destino</option><option value="savings">Ahorro del destino</option></select></label><p class="field-help">Saldo actual de origen: {{ sourceBalance() }}. Esta operación no se contará como gasto ni ingreso.</p>
        }
        <label>Fecha<input type="date" formControlName="date"></label>
        <details><summary>Notas opcionales</summary><label>Notas<textarea formControlName="notes" maxlength="500" rows="2"></textarea></label></details>
        <p class="error" role="alert">{{ error }}</p>
        <button type="submit" class="button primary wide">{{ kind() === 'transfer' ? 'Registrar transferencia de ejemplo' : 'Guardar ingreso de ejemplo' }}</button>
        <p class="form-note">Demo local · No se guarda en MySQL.</p>
      </form>
    }
  `
})
export class MovementFormComponent {
  readonly store = inject(DemoStore);
  readonly kind = input.required<'income' | 'transfer'>();
  readonly saved = output<void>();
  readonly form = new FormGroup({
    sourcePocket:new FormControl<Pocket>('cash',{nonNullable:true}),
    destinationPocket:new FormControl<Pocket>('cash',{nonNullable:true}),
    concept: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    amount: new FormControl('', { nonNullable: true }),
    account: new FormControl(this.store.preferredAccount(), { nonNullable: true }),
    destination: new FormControl('', { nonNullable: true }),
    date: new FormControl(localDate(), { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] })
  });
  error = '';
  constructor() {
    effect(() => {
      this.form.controls.account.setValue(this.store.preferredAccount());
      this.form.controls.destination.setValue('');
    });
    this.form.controls.destination.valueChanges.subscribe(id=>{if(id)this.form.controls.destinationPocket.setValue(this.store.defaultPocket(id));});
    this.form.controls.account.valueChanges.subscribe(id => {
      if(id)this.form.controls.sourcePocket.setValue(this.store.defaultPocket(id));
      if (this.form.controls.destination.value === this.form.controls.account.value) this.form.controls.destination.setValue('');
    });
  }
  sourceBalance(): string {
    const account = this.store.accounts().find(a => a.id === this.form.controls.account.value);
    return account ? euro(this.store.balance(account)) : '—';
  }
  save(): void {
    const value = this.form.getRawValue(), amount = cents(value.amount);
    if (this.form.invalid || !amount || !value.concept.trim()) {
      this.error = 'Escribe un concepto y un importe positivo con hasta dos decimales.'; return;
    }
    const kind = this.kind();
    const error = this.store.recordMovement({ ...value, kind, amount: kind === 'income' ? -amount : amount,
      category: kind === 'income' ? 'Ingreso' : 'Transferencia', destination: kind === 'transfer' ? value.destination : undefined });
    if (error) { this.error = error; return; }
    this.form.reset({sourcePocket:this.store.defaultPocket(this.store.preferredAccount()),destinationPocket:'cash', concept: '', amount: '', account: this.store.preferredAccount(), destination: '', date: localDate(), notes: '' });
    this.error = '';
    this.store.notify(kind === 'income' ? 'Ingreso añadido a la demo.' : 'Transferencia registrada. El saldo total no cambia.');
    this.saved.emit();
  }
}
