import { Component, effect, inject, output } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DemoStore } from './demo.store';
import { cents, localDate, signedCents, euro } from './money';
import { IncomeSplit, Pocket, splitAmount } from './money-flow';
import { AccountFormComponent } from './account-form.component';

@Component({
  selector: 'app-recurring-income-form',
  imports: [ReactiveFormsModule, AccountFormComponent],
  template: `
    @if (!store.accounts().length) {
      <div class="info-strip">Crea la cuenta en la que recibirás el ingreso.</div><app-account-form />
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()">
        <h2>Ingreso recurrente</h2><p class="muted">Tu nómina, un alquiler o ese ingreso que se repite cada mes.</p>
        <label>Concepto<input formControlName="concept" maxlength="100" placeholder="Por ejemplo, Nómina"></label>
        <label>Importe mensual (€)<input formControlName="amount" inputmode="decimal" placeholder="1500,00"></label>
        <label>Cuenta de destino<select formControlName="account">@for (a of store.accounts(); track a.id) {<option [value]="a.id">{{ a.name }}</option>}</select></label>
        <label>Ingresar en<select formControlName="pocket"><option value="cash">Efectivo</option><option value="savings">Ahorro</option></select></label>
        <label>Primer ingreso<input type="date" formControlName="startOn"></label>
        <p class="field-help">Se repite cada mes el día de esta fecha. Si el mes no tiene ese día, se usa su último día.</p>
        <details><summary>Fecha de fin opcional</summary><label>Último día de vigencia<input type="date" formControlName="endOn"></label></details>
        <details><summary>Repartir al recibir el ingreso</summary><p class="field-help">Ejemplo: 20 % a ahorro en Revolut y 20 % a inversión en MyInvestor. El resto permanece en la cuenta de origen. Primero configura el propósito de cada cuenta y, para inversión, su estrategia.</p><div formArrayName="splits">@for(row of form.controls.splits.controls;track row;let i=$index){<fieldset [formGroupName]="i" class="flow-row"><legend>Destino {{i+1}}</legend><label>Porcentaje (%)<input formControlName="percent" inputmode="decimal" placeholder="20,00"></label><label>Cuenta<select formControlName="account"><option value="">Selecciona</option>@for(a of store.accounts();track a.id){<option [value]="a.id">{{a.name}}</option>}</select></label><label>Propósito<select formControlName="pocket"><option value="cash">Efectivo</option><option value="savings">Ahorro</option><option value="investment">Inversión según estrategia</option></select></label><button type="button" class="button danger-subtle" (click)="form.controls.splits.removeAt(i)">Quitar destino</button></fieldset>}</div><button type="button" class="button subtle" (click)="addSplit()">＋ Añadir destino</button><p class="field-help">{{ splitPreview() }}</p></details>
        <p class="error" role="alert">{{ error }}</p>
        <button class="button primary wide" type="submit">Programar ingreso de ejemplo</button>
        <p class="form-note">Demo temporal · Los vencidos se registran con tu confirmación. No hay ejecución automática.</p>
      </form>
    }
  `
})
export class RecurringIncomeFormComponent {
  readonly store = inject(DemoStore);
  readonly saved = output<void>();
  readonly form = new FormGroup({
    pocket:new FormControl<Pocket>('cash',{nonNullable:true}),
    splits:new FormArray<FormGroup<{percent:FormControl<string>;account:FormControl<string>;pocket:FormControl<'cash'|'savings'|'investment'>}>>([]),
    concept: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    amount: new FormControl('', { nonNullable: true }),
    account: new FormControl(this.store.preferredAccount(), { nonNullable: true }),
    startOn: new FormControl(localDate(), { nonNullable: true }),
    endOn: new FormControl('', { nonNullable: true })
  });
  error = '';
  constructor() { this.form.controls.account.valueChanges.subscribe(id=>{if(id)this.form.controls.pocket.setValue(this.store.defaultPocket(id));});effect(() => this.form.controls.account.setValue(this.store.preferredAccount())); }
  addSplit():void{this.form.controls.splits.push(new FormGroup({percent:new FormControl('',{nonNullable:true}),account:new FormControl('',{nonNullable:true}),pocket:new FormControl<'cash'|'savings'|'investment'>('savings',{nonNullable:true})}));}
  splitPreview():string {
    const v=this.form.getRawValue(),amount=cents(v.amount);if(!amount||!v.splits.length)return '';
    try{const r=splitAmount(amount,v.splits.map(s=>signedCents(s.percent)??-1));return r.parts.map((n,i)=>`${this.store.accountName(v.splits[i].account)||'Destino'}: ${euro(n)}`).join(' · ')+` · Queda en origen: ${euro(r.remaining)}`;}catch{return 'Los porcentajes deben sumar como máximo 100 %.';}
  }
  save(): void {
    const value = this.form.getRawValue(), amount = cents(value.amount);
    if (this.form.invalid || !amount || !value.concept.trim()) {
      this.error = 'Escribe un concepto y un importe positivo con hasta dos decimales.'; return;
    }
    const splits:IncomeSplit[]=[];
    for(const row of value.splits){const percent=signedCents(row.percent);if(percent===null){this.error='Revisa los porcentajes del reparto.';return;}splits.push({account:row.account,pocket:row.pocket,percentBps:percent});}
    const error = this.store.addRecurringIncome({ ...value, amount, splits });
    if (error) { this.error = error; return; }
    this.form.controls.splits.clear();
    this.form.reset({pocket:'cash', concept: '', amount: '', account: this.store.preferredAccount(), startOn: localDate(), endOn: '' });
    this.error = ''; this.saved.emit();
  }
}
