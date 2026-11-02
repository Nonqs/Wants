import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app.component';
import { PageComponent } from './app/page.component';

const routes: Routes = [
  { path: '', component: PageComponent, title: 'Inicio · wants', data: { page: 'home' } },
  { path: 'gastos', component: PageComponent, title: 'Gastos · wants', data: { page: 'expenses' } },
  { path: 'deseos', component: PageComponent, title: 'Deseos · wants', data: { page: 'wishes' } },
  { path: 'cuentas', component: PageComponent, title: 'Cuentas · wants', data: { page: 'accounts' } },
  { path: 'mas', component: PageComponent, title: 'Más · wants', data: { page: 'more' } },
  { path: 'gasto-rapido', component: PageComponent, title: 'Añadir gasto · wants', data: { page: 'quick' } },
  { path: 'remuneradas', redirectTo: '/cuentas?seccion=remuneradas', pathMatch: 'full' },
  { path: 'inversiones', redirectTo: '/cuentas?seccion=inversiones', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];

bootstrapApplication(AppComponent, { providers: [provideRouter(routes)] })
  .catch(error => console.error('No se pudo iniciar la interfaz', error));
