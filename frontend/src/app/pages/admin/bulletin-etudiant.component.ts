import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Bulletin } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { BulletinComponent } from '../../shared/bulletin.component';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';

/** Bulletin d'un étudiant consulté par l'administrateur */
@Component({
  selector: 'app-bulletin-etudiant',
  standalone: true,
  imports: [RouterLink, BulletinComponent, ChargementComponent, IconeComponent],
  template: `
    <div class="page-entete no-print">
      <div>
        <a routerLink="/admin/etudiants" class="retour"><app-icone nom="retour" [taille]="16" /> Étudiants</a>
        <h1>Bulletin de notes</h1>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
        @if (semestres().length) {
          <div class="onglets">
            @for (s of semestres(); track s) {
              <button [class.actif]="choix() === s" (click)="choisir(s)">Semestre {{ s }}</button>
            }
            <button [class.actif]="choix() === null" (click)="choisir(null)">Relevé annuel</button>
          </div>
        }
        <button class="btn btn-secondaire bouton-imprimer" (click)="imprimer()"><app-icone nom="imprimer" /> Imprimer</button>
      </div>
    </div>
    @if (bulletin(); as b) { <app-bulletin [bulletin]="b" /> } @else { <app-chargement /> }
  `,
  styles: [`.retour { display:inline-flex; align-items:center; gap:4px; font-weight:600; font-size:13px; margin-bottom:6px; }`],
})
export class BulletinEtudiantComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  /** Paramètres de l'URL : /admin/etudiants/:id/bulletin?semestre=6 */
  id = input.required<string>();
  semestre = input<string>();

  choix = signal<number | null>(null);
  semestres = signal<number[]>([]);
  bulletin = signal<Bulletin | null>(null);
  private premierChargement = true;

  ngOnInit() {
    const s = Number(this.semestre());
    this.charger(s || undefined);
  }

  choisir(s: number | null) { this.choix.set(s); this.charger(s); }

  /** undefined = semestre par défaut (le dernier de l'année) */
  charger(semestre?: number | null) {
    this.bulletin.set(null);
    // Premier appel sans semestre connu : on récupère le relevé pour connaître les semestres de la classe
    const demande = semestre === undefined ? null : semestre;
    this.api.bulletinEtudiant(Number(this.id()), demande).subscribe({
      next: (b) => {
        this.semestres.set(b.entete.semestres);
        if (this.premierChargement && semestre === undefined) {
          this.premierChargement = false;
          this.choisir(b.entete.semestres[1]);
          return;
        }
        this.premierChargement = false;
        this.choix.set(b.semestre);
        this.bulletin.set(b);
      },
      error: (e) => this.toast.erreur(e),
    });
  }

  imprimer() { window.print(); }
}
