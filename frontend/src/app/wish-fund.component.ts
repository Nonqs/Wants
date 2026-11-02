import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DemoStore } from './demo.store';
import { cents, euro } from './money';
import { allocateFund } from './wish-allocation';

@Component({
  selector: 'app-wish-fund',
  imports: [ReactiveFormsModule],
  template: `
    <section class="panel wish-fund">
      <div class="section-heading"><div><span class="eyebrow">UN FONDO, MUCHOS OBJETIVOS</span><h2>Fondo común de deseos</h2></div><button class="button primary" (click)="amount.reset(); error = ''; depositDialog.showModal()">＋ Aportar al fondo</button></div>
      <div class="fund-totals"><span>Reservado en el fondo<strong>{{ euro(store.reserved()) }}</strong></span><span>Repartido entre deseos<strong>{{ euro(store.allocated()) }}</strong></span><span>Pendiente de repartir<strong>{{ euro(store.commonExtra()) }}</strong></span></div>
      <p class="muted">Una sola aportación se reparte entre los deseos activos según necesidad, utilidad, deseo y tiempo de espera. Tu patrimonio no aumenta.</p>
      <details><summary>Cómo se calcula el reparto</summary><p class="muted">Necesidad × 0,25 + utilidad × 0,30 + deseo × 0,20 + antigüedad × 0,25. La antigüedad vale 0 antes de 7 días, 1 hasta 30, 2 hasta 90 y 4 a partir de 90 días. Los céntimos restantes se asignan por mayor resto, con desempate por orden de lista. Pausar conserva lo ya reservado y excluye el deseo de futuras aportaciones.</p></details>
      @if (store.commonExtra() > 0) {<div class="info-strip">El pendiente equivale a «extra» en la CLI: permanece en el fondo si no hay objetivos elegibles.<button class="button subtle" (click)="store.distributeFundExtra()">Repartir pendiente</button></div>}
      @if (store.spendableTotal() < store.reserved()) {<p class="error">Tus reservas superan el saldo actual. Revisa tus movimientos antes de aportar más.</p>}
    </section>
    <dialog #depositDialog aria-labelledby="fund-title">
      <div class="dialog-heading"><span class="eyebrow">CADA POCO SUMA</span><button type="button" class="icon-button" (click)="depositDialog.close()" aria-label="Cerrar">✕</button></div>
      <form (submit)="$event.preventDefault(); deposit(depositDialog)"><h2 id="fund-title">Aportar al fondo común</h2><p class="muted">No eliges un deseo: el reparto sigue tus prioridades.</p>
        <label>Importe (€)<input [formControl]="amount" inputmode="decimal" placeholder="50,00" required></label><p class="field-help">Saldo sin reservar: {{ euro(store.spendableTotal() - store.reserved()) }}. La aportación reserva dinero existente, sin hacer una transferencia bancaria.</p>
        @if (preview(); as result) {<div class="allocation-preview"><h3>Así se reparte esta aportación</h3>@for (w of result.wishes; track $index; let i = $index) {@if (result.allocations[i] > 0) {<div><span>{{ w.name }}</span><strong>＋ {{ euro(result.allocations[i]) }}</strong></div>}}@if (result.extra > 0) {<div><span>Pendiente en el fondo</span><strong>{{ euro(result.extra) }}</strong></div>}</div>}
        @if (value() && !preview()) {<p class="error">Introduce un importe positivo con hasta dos decimales, dentro del saldo sin reservar.</p>}
        <p class="error" role="alert">{{ error }}</p><button type="submit" class="button primary wide" [disabled]="!preview()">Confirmar aportación de ejemplo</button><p class="form-note">Demo temporal · Los cambios se pierden al recargar.</p>
      </form>
    </dialog>
  `
})
export class WishFundComponent {
  readonly store = inject(DemoStore);
  readonly euro = euro;
  readonly amount = new FormControl('', { nonNullable: true });
  readonly value = toSignal(this.amount.valueChanges, { initialValue: '' });
  readonly preview = computed(() => {
    const amount = cents(this.value());
    return amount && amount <= this.store.spendableTotal() - this.store.reserved()
      ? allocateFund(this.store.wishes(), amount, Math.floor(Date.now()/1000)) : null;
  });
  error = '';
  deposit(dialog: HTMLDialogElement): void {
    const amount = cents(this.amount.value);
    if (!amount) { this.error = 'Introduce un importe positivo con hasta dos decimales.'; return; }
    const error = this.store.depositToWishFund(amount);
    if (error) { this.error = error; return; }
    this.amount.reset(); dialog.close();
  }
}
