import { Component, inject, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DemoStore } from './demo.store';
import { Purpose } from './money-flow';
import { localDate, signedCents, validDate } from './money';

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <h2>Nueva cuenta</h2>
      <p class="muted">Dale un lugar a tu dinero. Tú llevas el control.</p>
      <label>Nombre<input formControlName="name" maxlength="60" placeholder="Por ejemplo, Revolut" autocomplete="off"></label>
      <label>Tipo<select formControlName="type"><option>Cuenta corriente</option><option>Ahorro</option><option>Efectivo</option><option>Otra</option></select></label>
      <label>Propósito<select formControlName="purpose"><option value="cash">Efectivo para el día a día</option><option value="savings">Solo ahorro</option><option value="hybrid">Híbrida: efectivo y ahorro</option><option value="investment">Solo inversión</option></select></label>
      @if(form.controls.purpose.value==='hybrid'){<label>Parte del saldo inicial para ahorro (€)<input formControlName="savings" inputmode="decimal"></label>}
      <label>Saldo inicial (€)<input formControlName="initial" inputmode="text" placeholder="0,00" aria-describedby="balance-help"></label>
      <p id="balance-help" class="field-help">Admite cero y saldos negativos. No cuenta como un ingreso.</p>
      <label>Fecha del saldo<input type="date" formControlName="openedOn" [max]="today"></label>
      <label class="checkbox-label"><input type="checkbox" formControlName="makeDefault"> Usar por defecto para mis gastos</label>
      <p class="error" role="alert">{{ error }}</p>
      <button type="submit" class="button primary wide">Crear cuenta de ejemplo</button>
      <p class="form-note">Solo EUR · Sin conexión bancaria · Se pierde al recargar</p>
    </form>
  `
})
export class AccountFormComponent {
  readonly store = inject(DemoStore);
  readonly saved = output<string>();
  readonly today = localDate();
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    purpose:new FormControl<Purpose>('cash',{nonNullable:true}),
    savings:new FormControl('0,00',{nonNullable:true}),
    type: new FormControl('Cuenta corriente', { nonNullable: true }),
    initial: new FormControl('0,00', { nonNullable: true }),
    openedOn: new FormControl(localDate(), { nonNullable: true }),
    makeDefault: new FormControl(false, { nonNullable: true })
  });
  error = '';
  save(): void {
    const value = this.form.getRawValue(), name = value.name.trim(), initial = signedCents(value.initial);
    if (this.form.invalid || !name || initial === null) {
      this.error = 'Escribe un nombre y un saldo con hasta dos decimales.'; return;
    }
    if (!validDate(value.openedOn) || value.openedOn > localDate()) {
      this.error = 'Elige una fecha válida que no sea futura.'; return;
    }
    if (this.store.accounts().some(a => a.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) {
      this.error = 'Ya existe una cuenta con ese nombre. Usa otro para distinguirlas.'; return;
    }
    const saving=signedCents(value.savings);if(saving===null||(value.purpose==='hybrid'&&(saving<0||saving>initial))){this.error='La parte de ahorro debe estar entre cero y el saldo inicial.';return;}
    const id = this.store.addAccount({ name, initial, subtitle: value.type, openedOn: value.openedOn, purpose:value.purpose, savingsOffset:value.purpose==='hybrid'?saving:0 }, value.makeDefault && value.purpose!=='savings' && value.purpose!=='investment');
    this.form.reset(); this.error = ''; this.saved.emit(id);
  }
}
