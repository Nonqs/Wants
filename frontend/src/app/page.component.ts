import { ActionGroupComponent } from './action-group.component';
import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { cents, DemoStore, euro, localDate, Wish, Transaction } from './demo.store';
import { ExpenseFormComponent } from './expense-form.component';
import { AccountFormComponent } from './account-form.component';
import { MovementFormComponent } from './movement-form.component';
import { RecurringIncomeFormComponent } from './recurring-income-form.component';
import { WishFundComponent } from './wish-fund.component';
import { EditMovementComponent } from './edit-movement.component';
import { prepareWishImage } from './wish-image';
import { WishPurchaseComponent } from './wish-purchase.component';
import { AccountPurposeComponent } from './account-purpose.component';
import { FinanceComponent } from './finance.component';
import { wishWeight } from './wish-allocation';

@Component({
  selector: 'app-page',
  imports: [ActionGroupComponent,RouterLink, NgTemplateOutlet, ReactiveFormsModule, ExpenseFormComponent, AccountFormComponent, MovementFormComponent, RecurringIncomeFormComponent, WishFundComponent, EditMovementComponent, WishPurchaseComponent, FinanceComponent, AccountPurposeComponent],
  templateUrl: './page.component.html'
})
export class PageComponent {
  readonly store = inject(DemoStore);
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly page = computed(() => String(this.routeData()['page'] ?? 'home'));
  private readonly queryParams=toSignal(this.route.queryParamMap,{initialValue:this.route.snapshot.queryParamMap});
  readonly accountSection=computed(()=>{const section=this.queryParams().get('seccion');return section==='remuneradas'?'savings':section==='inversiones'?'investments':'cash';});
  readonly euro = euro;
  readonly cashAccounts=computed(()=>this.store.accounts().filter(a=>a.purpose!=='savings'&&a.purpose!=='investment'));
  readonly defaultAccount = computed(() => this.store.accounts().find(a => a.id === this.store.defaultAccount()));
  readonly today = localDate();
  readonly filter = signal('');
  readonly wishTab=signal<'active' | 'purchased' | 'archived'>('active');
  readonly visibleWishes=computed(()=>this.store.wishes().filter(w=>(w.status ?? 'active')===this.wishTab()));
  readonly activeWishes=computed(()=>this.store.wishes().filter(w=>(w.status ?? 'active')==='active'));
  readonly cardWishes=computed(()=>this.page()==='home'?this.activeWishes():this.visibleWishes());
  readonly wishImage=signal<string | undefined>(undefined);
  readonly imageBusy=signal(false);
  private imageRequest=0;
  imageError='';
  readonly purchaseTarget=signal<Wish | null>(null);
  readonly archiveTarget=signal<Wish | null>(null);
  archiveError='';
  readonly showVoided = signal(false);
  readonly recentMovements = computed(() => this.store.transactions().filter(t => !t.voidedAt).slice(0,4));
  readonly filtered = computed(() => this.store.transactions().filter(t => (this.showVoided() || !t.voidedAt) && (t.concept+' '+t.category+' '+this.store.accountName(t.account)+' '+(t.destination ? this.store.accountName(t.destination) : '')).toLocaleLowerCase('es').includes(this.filter().toLocaleLowerCase('es'))));
  readonly titles: Record<string,string> = { home: 'Un vistazo a lo que importa.', expenses: 'Tus movimientos.', wishes: 'Desear con intención.', accounts: 'Tu dinero, en su sitio.', more: 'Un espacio a tu medida.', quick: 'Un gasto, en segundos.' };
  readonly subtitles: Record<string,string> = { home: 'Cada pequeño paso cuenta. Aquí tienes el tuyo.', expenses: 'Lo cotidiano también merece un poco de claridad.', wishes: 'Haz sitio a lo que te ilusiona. Un poco cada vez.', accounts: 'Cuentas manuales, sin conexiones bancarias.', more: 'Primero lo esencial. Después, lo que te ayude.', quick: 'Concepto, importe y listo.' };
  readonly wishForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    price: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    url: new FormControl('', { nonNullable: true }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    necessity: new FormControl(5, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10), Validators.pattern(/^\d+$/)] }),
    utility: new FormControl(5, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10), Validators.pattern(/^\d+$/)] }),
    desire: new FormControl(5, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10), Validators.pattern(/^\d+$/)] }),
    wish: new FormControl(true, { nonNullable: true })
  });
  wishError = '';
  readonly score = (w: Parameters<typeof wishWeight>[0]) => (wishWeight(w, Math.floor(Date.now()/1000))/100).toFixed(2);

  percent(saved: number, price: number): number { return Math.floor(saved / price * 100); }
  editingWishId: string | null = null;
  readonly cancellationTarget = signal<string | null>(null);
  readonly cancellingWish = computed(() => this.store.wishes().find(w => w.id === this.cancellationTarget()));
  readonly cancellationMode = new FormControl<'redistribute' | 'release'>('redistribute', { nonNullable: true });
  cancellationError = '';

  openNewWish(dialog: HTMLDialogElement): void {
    this.imageRequest++; this.wishImage.set(undefined); this.imageBusy.set(false); this.imageError='';
    this.editingWishId = null; this.wishForm.reset(); this.wishError = ''; dialog.showModal();
  }
  openEditWish(w: Wish, dialog: HTMLDialogElement): void {
    this.imageRequest++; this.wishImage.set(w.image); this.imageBusy.set(false); this.imageError='';
    this.editingWishId = w.id;
    this.wishForm.reset({ name: w.name, price: `${Math.floor(w.price/100)},${String(w.price%100).padStart(2,'0')}`, url: w.url, note: w.note,
      necessity: w.necessity, utility: w.utility, desire: w.desire, wish: w.wish });
    this.wishError = ''; dialog.showModal();
  }
  saveWish(dialog: HTMLDialogElement): void {
    if(this.imageBusy()){this.wishError='Espera a que termine de preparar la imagen.';return;}
    const value = this.wishForm.getRawValue(), price = cents(value.price);
    if (this.wishForm.invalid || !price) { this.wishError = 'Revisa el nombre, el precio positivo, las notas y las prioridades enteras entre 0 y 10.'; return; }
    const error = this.store.saveWish(this.editingWishId,{ ...value, price },this.wishImage());
    if (error) { this.wishError = error; return; }
    dialog.close();
  }
  openCancelWish(w: Wish, dialog: HTMLDialogElement): void {
    this.cancellationTarget.set(w.id); this.cancellationMode.reset(); this.cancellationError = ''; dialog.showModal();
  }
  confirmCancellation(dialog: HTMLDialogElement): void {
    const id = this.cancellationTarget();
    if (!id) return;
    const error = this.store.cancelWish(id,this.cancellationMode.value);
    if (error) { this.cancellationError = error; return; }
    this.cancellationTarget.set(null); dialog.close();
  }
  readonly editingMovement = signal<Transaction | null>(null);
  readonly voidingMovement = signal<Transaction | null>(null);
  voidError = '';
  openMovementEdit(t: Transaction, dialog: HTMLDialogElement): void {
    this.editingMovement.set(t); dialog.showModal();
  }
  openMovementVoid(t: Transaction, dialog: HTMLDialogElement): void {
    this.voidingMovement.set(t); this.voidError=''; dialog.showModal();
  }
  confirmMovementVoid(dialog: HTMLDialogElement): void {
    const id=this.voidingMovement()?.id;
    if (!id) return;
    const error=this.store.voidMovement(id);
    if (error) { this.voidError=error; return; }
    dialog.close(); this.voidingMovement.set(null);
  }

  async selectWishImage(event: Event): Promise<void> {
    const input=event.target as HTMLInputElement,file=input.files?.[0];
    if(!file)return;
    const request=++this.imageRequest; this.imageBusy.set(true);this.imageError='';
    try { const image=await prepareWishImage(file); if(request===this.imageRequest)this.wishImage.set(image); }
    catch(error){if(request===this.imageRequest)this.imageError=error instanceof Error?error.message:'No se pudo leer la imagen.';}
    finally {if(request===this.imageRequest)this.imageBusy.set(false);input.value='';}
  }
  removeWishImage():void {this.imageRequest++;this.wishImage.set(undefined);this.imageBusy.set(false);this.imageError='';}
  openPurchase(w:Wish,dialog:HTMLDialogElement):void {this.purchaseTarget.set(w);dialog.showModal();}
  openArchive(w:Wish,dialog:HTMLDialogElement):void {this.archiveTarget.set(w);this.archiveError='';dialog.showModal();}
  confirmArchive(dialog:HTMLDialogElement):void {
    const w=this.archiveTarget();if(!w)return;
    const error=this.store.archiveWish(w.id);if(error){this.archiveError=error;return;}dialog.close();this.archiveTarget.set(null);
  }
  purchaseLabel(w:Wish):string {
    const t=this.store.transactions().find(t=>t.id===w.purchaseTransactionId);
    return t ? `Comprado el ${t.date} · ${euro(t.amount)}` : '';
  }

}
