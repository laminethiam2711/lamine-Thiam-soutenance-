import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Bulletin } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { BulletinComponent } from '../../shared/bulletin.component';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';

@Component({
  selector: 'app-mon-bulletin',
  standalone: true,
  imports: [BulletinComponent, ChargementComponent, IconeComponent],
  template: `
    <div class="page-entete no-print">
      <div>
        <h1>Mon bulletin</h1>
        <p>Vos notes, moyennes, crédits et décisions, mis à jour dès que vos enseignants saisissent les notes.</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
        @if (semestres().length) {
          <div class="onglets">
            @for (s of semestres(); track s) {
              <button [class.actif]="choix() === s" (click)="charger(s)">Semestre {{ s }}</button>
            }
            <button [class.actif]="choix() === null" (click)="charger(null)">Relevé annuel</button>
          </div>
        }
        <button class="btn btn-secondaire bouton-imprimer" (click)="imprimer()"><app-icone nom="imprimer" /> Imprimer</button>
      </div>
    </div>
    @if (bulletin(); as b) { <app-bulletin [bulletin]="b" /> } @else { <app-chargement /> }
  `,
})
export class MonBulletinComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  choix = signal<number | null>(null);
  semestres = signal<number[]>([]);
  bulletin = signal<Bulletin | null>(null);

  ngOnInit() {
    // Le premier semestre de la classe est affiché par défaut
    this.api.monBulletin(null).subscribe({
      next: (b) => { this.semestres.set(b.entete.semestres); this.charger(b.entete.semestres[0]); },
      error: (e) => this.toast.erreur(e),
    });
  }

  charger(semestre: number | null) {
    this.choix.set(semestre);
    this.bulletin.set(null);
    this.api.monBulletin(semestre).subscribe({
      next: (b) => this.bulletin.set(b),
      error: (e) => this.toast.erreur(e),
    });
  }

  imprimer() { window.print(); }
}
