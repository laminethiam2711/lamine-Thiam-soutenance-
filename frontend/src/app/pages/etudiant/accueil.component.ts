import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ResumeEtudiant } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { NotePipe } from '../../shared/note.pipe';
import { classeBadge } from '../../shared/fonctions';

@Component({
  selector: 'app-accueil-etudiant',
  standalone: true,
  imports: [RouterLink, NotePipe, IconeComponent, ChargementComponent],
  template: `
    @if (resume(); as r) {
      <section class="bienvenue">
        <div>
          <h1>Bonjour {{ auth.user()?.prenom }}</h1>
          <p>{{ r.entete.classe }} · {{ r.entete.specialite }} · {{ r.entete.annee_academique }}</p>
        </div>
        <a class="btn" routerLink="/etudiant/bulletin"><app-icone nom="bulletin" /> Voir mon bulletin</a>
      </section>

      <div class="cartes">
        @for (s of [r.semestre_1, r.semestre_2]; track s.semestre) {
          <div class="carte resultat">
            <div class="titre">Semestre {{ s.semestre }}</div>
            <div class="moyenne chiffre">{{ s.moyenne | note }}<small>/20</small></div>
            <div class="credits">
              <div class="barre"><div class="rempli" [style.width.%]="(s.credits_obtenus / (s.credits_requis || 1)) * 100"></div></div>
              <span class="chiffre"><b>{{ s.credits_obtenus }}</b> / {{ s.credits_requis }} crédits</span>
            </div>
            <div class="detail">{{ s.ues_validees }} UE validée(s) sur {{ s.ues_total }}</div>
            <span [class]="classeBadge(s.decision)">{{ s.decision }}</span>
          </div>
        }
        <div class="carte resultat annuel">
          <div class="titre">Résultat de l'année</div>
          <div class="moyenne chiffre">{{ r.annuel.moyenne_generale | note }}<small>/20</small></div>
          <div class="credits">
            <div class="barre"><div class="rempli" [style.width.%]="(r.annuel.credits_total / (r.annuel.credits_requis || 1)) * 100"></div></div>
            <span class="chiffre"><b>{{ r.annuel.credits_total }}</b> / {{ r.annuel.credits_requis }} crédits</span>
          </div>
          <div class="detail">Moyenne générale = (S{{ r.semestre_1.semestre }} + S{{ r.semestre_2.semestre }}) / 2</div>
          <span [class]="classeBadge(r.annuel.decision)">{{ r.annuel.decision }}</span>
        </div>
      </div>
    } @else { <app-chargement /> }
  `,
  styles: [`
    .bienvenue { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
      background: linear-gradient(135deg, var(--navy-800), var(--navy-950)); color: #fff;
      border-radius: 14px; padding: 28px 30px; margin-bottom: 22px; }
    .bienvenue h1 { color: #fff; font-size: 26px; }
    .bienvenue p { color: #a9bfe0; margin: 6px 0 0; }
    .bienvenue .btn { background: #fff; color: var(--navy-900); }
    .cartes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .resultat { padding: 22px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
    .resultat.annuel { border: 2px solid var(--navy-800); }
    .titre { font-weight: 650; color: var(--texte-doux); text-transform: uppercase; font-size: 12px; letter-spacing: .06em; }
    .moyenne { font-size: 40px; font-weight: 750; color: var(--navy-900); }
    .moyenne small { font-size: 16px; color: var(--texte-doux); margin-left: 3px; font-weight: 500; }
    .credits { display: flex; align-items: center; gap: 10px; width: 100%; font-size: 13px; color: var(--texte-doux); }
    .credits b { color: var(--navy-900); }
    .barre { flex: 1; height: 8px; background: var(--bleu-pale); border-radius: 999px; overflow: hidden; }
    .rempli { height: 100%; background: var(--navy-700); border-radius: 999px; }
    .detail { color: var(--texte-doux); font-size: 13px; }
    @media (max-width: 900px) { .cartes { grid-template-columns: 1fr; } }
  `],
})
export class AccueilEtudiantComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  resume = signal<ResumeEtudiant | null>(null);
  classeBadge = classeBadge;

  ngOnInit() {
    this.api.monResume().subscribe({ next: (r) => this.resume.set(r), error: (e) => this.toast.erreur(e) });
  }
}
