import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Classe, Specialite } from '../../core/models';
import { ToastService, messageErreur } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [FormsModule, IconeComponent, ModalComponent, ChargementComponent],
  templateUrl: './classes.component.html',
})
export class ClassesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  classes = signal<Classe[] | null>(null);
  specialites = signal<Specialite[]>([]);
  modalOuvert = signal(false);
  enCours = signal(false);
  erreur = signal('');
  edition: Classe | null = null;
  form: Partial<Classe> = {};

  ngOnInit() {
    this.api.specialites().subscribe((s) => this.specialites.set(s));
    this.charger();
  }

  charger() {
    this.api.classes().subscribe({ next: (c) => this.classes.set(c), error: (e) => this.toast.erreur(e) });
  }

  /** Semestres LMD d'un niveau : L3 → S5 et S6 */
  semestres(niveau: number | undefined) {
    return niveau ? `S${niveau * 2 - 1} · S${niveau * 2}` : '';
  }

  ouvrir(classe?: Classe) {
    this.edition = classe ?? null;
    this.form = classe
      ? { libelle: classe.libelle, specialite_id: classe.specialite_id, grade: classe.grade, niveau: classe.niveau, annee_academique: classe.annee_academique }
      : { libelle: '', specialite_id: this.specialites()[0]?.id, grade: 'Licence', niveau: 1, annee_academique: '2025-2026' };
    this.erreur.set('');
    this.modalOuvert.set(true);
  }

  enregistrer() {
    this.enCours.set(true);
    const requete = this.edition ? this.api.modifierClasse(this.edition.id, this.form) : this.api.creerClasse(this.form);
    requete.subscribe({
      next: () => {
        this.toast.succes(this.edition ? 'Classe modifiée.' : 'Classe ajoutée.');
        this.modalOuvert.set(false);
        this.enCours.set(false);
        this.charger();
      },
      error: (e) => { this.erreur.set(messageErreur(e)); this.enCours.set(false); },
    });
  }

  supprimer(c: Classe) {
    if (!confirm(`Supprimer la classe « ${c.libelle} » ?`)) return;
    this.api.supprimerClasse(c.id).subscribe({
      next: () => { this.toast.succes('Classe supprimée.'); this.charger(); },
      error: (e) => this.toast.erreur(e),
    });
  }
}
