import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="toasts no-print">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.erreur]="t.type === 'erreur'" (click)="toast.fermer(t.id)">{{ t.texte }}</div>
      }
    </div>
  `,
  styles: [`
    .toasts { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 100; }
    .toast { min-width: 260px; max-width: 380px; padding: 12px 16px; border-radius: 9px; cursor: pointer;
      background: var(--navy-900); color: #fff; font-weight: 550; box-shadow: 0 10px 30px rgba(6,20,40,.3);
      border-left: 4px solid #3ecf8e; animation: entre .2s ease-out; }
    .toast.erreur { border-left-color: #ff6b5e; }
    @keyframes entre { from { transform: translateY(10px); opacity: 0 } }
  `],
})
export class AppComponent {
  toast = inject(ToastService);
}
