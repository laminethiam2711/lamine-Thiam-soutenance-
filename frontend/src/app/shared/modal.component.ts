import { Component, input, output } from '@angular/core';
import { IconeComponent } from './icone.component';

/** Fenêtre modale réutilisable (formulaires d'ajout / modification) */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconeComponent],
  template: `
    <div class="fond" (click)="fermer.emit()">
      <div class="fenetre" [style.max-width.px]="largeur()" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <header>
          <h2>{{ titre() }}</h2>
          <button type="button" class="btn-icone" (click)="fermer.emit()" aria-label="Fermer">
            <app-icone nom="fermer" />
          </button>
        </header>
        <div class="corps"><ng-content /></div>
      </div>
    </div>
  `,
  styles: [`
    .fond { position: fixed; inset: 0; background: rgba(6, 20, 40, .55); display: flex;
      align-items: flex-start; justify-content: center; padding: 6vh 16px; z-index: 50; overflow-y: auto;
      animation: apparait .15s ease-out; }
    .fenetre { background: #fff; border-radius: 12px; width: 100%; box-shadow: 0 20px 50px rgba(6, 20, 40, .35); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px;
      border-bottom: 1px solid var(--bordure); }
    h2 { font-size: 17px; }
    .corps { padding: 22px; }
    @keyframes apparait { from { opacity: 0 } }
  `],
})
export class ModalComponent {
  titre = input('');
  largeur = input(620);
  fermer = output<void>();
}
