import { Component, computed, input } from '@angular/core';
import { Bulletin, ResultatSemestre, StatutUe } from '../core/models';
import { NotePipe } from './note.pipe';
import { LIBELLE_STATUT } from './fonctions';
import { environment } from '../../environments/environment';

/**
 * Bulletin de notes au format de l'ISI (système LMD).
 *  - bulletin d'un semestre ;
 *  - bulletin du 2e semestre : reprend le 1er semestre et le résultat annuel ;
 *  - relevé annuel : les deux semestres.
 */
@Component({
  selector: 'app-bulletin',
  standalone: true,
  imports: [NotePipe],
  templateUrl: './bulletin.component.html',
  styleUrl: './bulletin.component.css',
})
export class BulletinComponent {
  bulletin = input.required<Bulletin>();
  etablissement = environment.etablissement;
  sigle = environment.sigle;
  signataire = environment.signataire;
  libelleStatut = LIBELLE_STATUT;
  dateEdition = new Date().toLocaleDateString('fr-FR');

  titre = computed(() => {
    const s = this.bulletin().semestre;
    return s ? `Semestre ${s}` : 'Relevé annuel';
  });

  /** La colonne « Rattrap. » n'apparaît que si au moins un EC a une note de rattrapage */
  avecRattrapage = computed(() =>
    this.bulletin().semestres.some((s) => s.ues.some((u) => u.ecs.some((e) => e.rattrapage !== null))));

  /** Récapitulatifs à afficher en bas (1er semestre, puis 2e semestre) */
  recapitulatifs = computed(() => {
    const b = this.bulletin();
    const liste: ResultatSemestre[] = [];
    if (b.semestre_precedent) liste.push(b.semestre_precedent);
    liste.push(...b.semestres);
    return liste;
  });

  /** Résumé des semestres pour l'encadré annuel */
  semestresAnnee = computed(() => {
    const b = this.bulletin();
    return b.semestre_precedent ? [b.semestre_precedent, ...b.semestres] : b.semestres;
  });

  colonnes = computed(() => (this.avecRattrapage() ? 10 : 9));

  classeStatut(s: StatutUe): string {
    return 'statut statut-' + s;
  }

  /** Les 6 cases du récapitulatif (cases vides si moins de 6 UE, comme sur le bulletin papier) */
  cases(r: ResultatSemestre) {
    const n = Math.max(6, r.recapitulatif.length);
    return Array.from({ length: n }, (_, i) => r.recapitulatif[i] ?? null);
  }
}
