import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DemoStore } from './demo.store';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent {
  readonly store = inject(DemoStore);
  readonly nav = [
    { path: '/', label: 'Inicio', icon: '⌂' },
    { path: '/gastos', label: 'Gastos', icon: '↗' },
    { path: '/deseos', label: 'Deseos', icon: '♡' },
    { path: '/cuentas', label: 'Cuentas', icon: '▣' },
    { path: '/mas', label: 'Más', icon: '☰' }
  ];
  toggleTheme(): void {
    const current = document.documentElement.dataset['theme'];
    const dark = current ? current === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset['theme'] = dark ? 'light' : 'dark';
  }
}
