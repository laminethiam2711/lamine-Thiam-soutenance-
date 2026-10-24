import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Ec, NoteSaisie } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { NotePipe } from '../../shared/note.pipe';
import { classeNote } from '../../shared/fonctions';

/**
 * Saisie des notes d'un EC pour toute la classe : MCC, examen et rattrapage.
 * La moyenne EC est recalculée en direct avec la même règle que l'API :
 *   Moy EC = MCC × 40 % + Examen × 60 % (le rattrapage remplace l'examen s'il est meilleur).
 */
@Component({
  selector: 'app-saisie-notes',
  standalone: true,
  imports: [FormsModule, RouterLink, NotePipe, IconeComponent, ChargementComponent],
  templateUrl: './saisie-notes.component.html',
  styleUrl: './saisie-notes.component.css',
})
export class SaisieNotesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  id = input.required<string>();
  ec = signal<Ec | null>(null);
  lignes = signal<NoteSaisie[] | null>(null);
  enCours = signal(false);
  modifie = signal(false);
  classeNote = classeNote;

  ngOnInit() { this.charger(); }

  charger() {
    this.api.notesEc(Number(this.id())).subscribe({
      next: (r) => { this.ec.set(r.ec); this.lignes.set(r.etudiants); this.modifie.set(false); },
      error: (e) => this.toast.erreur(e),
    });
  }

  valeur(v: number | string | null | undefined): number | null {
    return v === null || v === undefined || v === '' ? null : Number(v);
  }

  invalide(v: number | string | null | undefined): boolean {
    const n = this.valeur(v);
    return n !== null && (isNaN(n) || n < 0 || n > 20);
  }

  moyenne(l: NoteSaisie): number | null {
    if (this.invalide(l.mcc) || this.invalide(l.examen) || this.invalide(l.rattrapage)) return null;
    const mcc = this.valeur(l.mcc);
    const ex = this.valeur(l.examen);
    const ratt = this.valeur(l.rattrapage);
    const retenu = ratt !== null && (ex === null || ratt > ex) ? ratt : ex;
    if (retenu === null) return null;
    if (mcc === null) return Math.round(retenu * 100) / 100;
    return Math.round((mcc * 0.4 + retenu * 0.6) * 100) / 100;
  }

  aDesErreurs = computed(() =>
    (this.lignes() ?? []).some((l) => this.invalide(l.mcc) || this.invalide(l.examen) || this.invalide(l.rattrapage)));

  changement() {
    this.modifie.set(true);
    this.lignes.update((l) => (l ? [...l] : l));
  }

  enregistrer() {
    if (this.aDesErreurs()) {
      this.toast.erreur(null, 'Certaines notes ne sont pas comprises entre 0 et 20.');
      return;
    }
    this.enCours.set(true);
    const notes = (this.lignes() ?? []).map((l) => ({
      inscription_id: l.inscription_id,
      mcc: this.valeur(l.mcc),
      examen: this.valeur(l.examen),
      rattrapage: this.valeur(l.rattrapage),
    }));
    this.api.enregistrerNotes(Number(this.id()), notes).subscribe({
      next: (r) => { this.toast.succes(r.message); this.enCours.set(false); this.charger(); },
      error: (e) => { this.toast.erreur(e); this.enCours.set(false); },
    });
  }
}
