import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Ec } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';

/** Les Éléments Constitutifs (EC) attribués à l'enseignant connecté */
@Component({
  selector: 'app-mes-matieres',
  standalone: true,
  imports: [RouterLink, IconeComponent, ChargementComponent],
  template: `
    <div class="page-entete">
      <div>
        <h1>Mes enseignements</h1>
        <p>Bonjour {{ auth.user()?.prenom }}, choisissez un élément constitutif pour saisir les notes.</p>
      </div>
    </div>

    @if (ecs(); as liste) {
      <div class="grille">
        @for (ec of liste; track ec.id) {
          <a class="carte ec" [routerLink]="['/enseignant/ecs', ec.id, 'notes']">
            <div class="haut">
              <span class="badge badge-bleu">{{ ec.ue?.code }}</span>
              <span class="badge badge-gris">{{ ec.ue?.classe?.libelle }} · S{{ ec.ue?.semestre }}</span>
            </div>
            <h2>{{ ec.libelle }}</h2>
            <div class="ue">{{ ec.ue?.libelle }}</div>
            <div class="infos">
              <span>Coef. {{ ec.coefficient }}</span>
              <span>{{ ec.effectif }} étudiants</span>
            </div>
            <div class="progression">
              <div class="barre"><div class="rempli" [style.width.%]="ec.progression"></div></div>
              <span class="chiffre">{{ ec.progression }} %</span>
            </div>
            <div class="action"><app-icone nom="notes" [taille]="16" /> Saisir les notes</div>
          </a>
        } @empty {
          <div class="carte vide">Aucun élément constitutif ne vous est encore attribué. Contactez l'administration.</div>
        }
      </div>
    } @else { <app-chargement /> }
  `,
  styles: [`
    .grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 18px; }
    .ec { padding: 20px; color: inherit; display: flex; flex-direction: column; gap: 10px;
      transition: border-color .15s, transform .15s; border-top: 3px solid var(--navy-800); }
    .ec:hover { border-color: var(--navy-600); transform: translateY(-2px); }
    .haut { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    h2 { font-size: 16.5px; }
    .ue { color: var(--texte-doux); font-size: 13px; margin-top: -6px; }
    .infos { display: flex; gap: 14px; flex-wrap: wrap; color: var(--texte-doux); font-size: 13px; }
    .progression { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 650; color: var(--navy-800); }
    .barre { flex: 1; height: 8px; background: var(--bleu-pale); border-radius: 999px; overflow: hidden; }
    .rempli { height: 100%; background: var(--navy-700); border-radius: 999px; }
    .action { display: flex; align-items: center; gap: 6px; color: var(--bleu); font-weight: 650; font-size: 13.5px; }
  `],
})
export class MesMatieresComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  ecs = signal<Ec[] | null>(null);

  ngOnInit() {
    this.api.mesEcs().subscribe({ next: (e) => this.ecs.set(e), error: (e) => this.toast.erreur(e) });
  }
}
