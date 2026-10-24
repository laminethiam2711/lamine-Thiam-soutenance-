import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Classe, Ec, Enseignant, Ue } from '../../core/models';
import { ToastService, messageErreur } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { ModalComponent } from '../../shared/modal.component';
import { NotePipe } from '../../shared/note.pipe';

/**
 * Programme d'une classe : Unités d'Enseignement (UE, avec leurs crédits)
 * et leurs Éléments Constitutifs (EC, avec leur coefficient et leur enseignant).
 */
@Component({
  selector: 'app-programme',
  standalone: true,
  imports: [FormsModule, IconeComponent, ModalComponent, ChargementComponent, NotePipe],
  templateUrl: './programme.component.html',
  styles: [`
    .barre { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
    .barre select { width: auto; min-width: 220px; }
    .totaux { display: flex; gap: 8px; flex-wrap: wrap; }
    .ue { margin-bottom: 16px; }
    .ue .carte-entete { background: var(--bleu-tres-pale); }
    .ue h2 { font-size: 15px; }
    .ue h2 .code { color: var(--navy-700); margin-right: 8px; }
    .infos-ue { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .btn-petit { height: 32px; padding: 0 12px; font-size: 13px; }
    .alerte { background: var(--or-pale); color: var(--or); border-radius: 8px; padding: 10px 14px; font-size: 13.5px; margin-bottom: 16px; }
  `],
})
export class ProgrammeComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  classes = signal<Classe[]>([]);
  enseignants = signal<Enseignant[]>([]);
  ues = signal<Ue[] | null>(null);
  classeId = signal<number | null>(null);
  semestre = signal<number | null>(null);

  modal = signal<'ue' | 'ec' | null>(null);
  enCours = signal(false);
  erreur = signal('');
  editionId: number | null = null;
  form: any = {};

  classe = computed(() => this.classes().find((c) => c.id === this.classeId()) ?? null);

  totaux = computed(() => {
    const liste = this.ues() ?? [];
    return {
      credits: liste.reduce((s, u) => s + u.credits, 0),
      coefficients: liste.reduce((s, u) => s + (u.ecs ?? []).reduce((t, e) => t + e.coefficient, 0), 0),
      ecs: liste.reduce((s, u) => s + (u.ecs?.length ?? 0), 0),
    };
  });

  ngOnInit() {
    this.api.enseignants().subscribe((e) => this.enseignants.set(e));
    this.api.classes().subscribe((c) => {
      this.classes.set(c);
      if (c.length) {
        const l3 = c[c.length - 1];
        this.classeId.set(l3.id);
        this.semestre.set(l3.semestres[0]);
        this.charger();
      } else {
        this.ues.set([]);
      }
    });
  }

  changerClasse(id: number) {
    this.classeId.set(id);
    this.semestre.set(this.classe()?.semestres[0] ?? null);
    this.charger();
  }

  changerSemestre(s: number) { this.semestre.set(s); this.charger(); }

  charger() {
    this.ues.set(null);
    this.api.ues({ classe_id: this.classeId(), semestre: this.semestre() }).subscribe({
      next: (u) => this.ues.set(u),
      error: (e) => this.toast.erreur(e),
    });
  }

  ouvrirUe(ue?: Ue) {
    this.editionId = ue?.id ?? null;
    this.form = ue
      ? { code: ue.code, libelle: ue.libelle, credits: ue.credits, semestre: ue.semestre, classe_id: ue.classe_id }
      : { code: '', libelle: '', credits: 4, semestre: this.semestre(), classe_id: this.classeId() };
    this.erreur.set('');
    this.modal.set('ue');
  }

  ouvrirEc(ue: Ue, ec?: Ec) {
    this.editionId = ec?.id ?? null;
    this.form = ec
      ? { ue_id: ec.ue_id, libelle: ec.libelle, coefficient: ec.coefficient, enseignant_id: ec.enseignant_id }
      : { ue_id: ue.id, libelle: '', coefficient: 2, enseignant_id: null };
    this.erreur.set('');
    this.modal.set('ec');
  }

  enregistrer() {
    const id = this.editionId;
    const requete = this.modal() === 'ue'
      ? (id ? this.api.modifierUe(id, this.form) : this.api.creerUe(this.form))
      : (id ? this.api.modifierEc(id, this.form) : this.api.creerEc(this.form));
    this.enCours.set(true);
    (requete as any).subscribe({
      next: () => {
        this.toast.succes(id ? 'Modification enregistrée.' : 'Ajout enregistré.');
        this.modal.set(null);
        this.enCours.set(false);
        this.charger();
      },
      error: (e: unknown) => { this.erreur.set(messageErreur(e)); this.enCours.set(false); },
    });
  }

  supprimerUe(ue: Ue) {
    if (!confirm(`Supprimer l'UE « ${ue.code} » avec ses EC et toutes leurs notes ?`)) return;
    this.api.supprimerUe(ue.id).subscribe({
      next: (r) => { this.toast.succes(r.message); this.charger(); },
      error: (e) => this.toast.erreur(e),
    });
  }

  supprimerEc(ec: Ec) {
    if (!confirm(`Supprimer l'EC « ${ec.libelle} » et ses notes ?`)) return;
    this.api.supprimerEc(ec.id).subscribe({
      next: (r) => { this.toast.succes(r.message); this.charger(); },
      error: (e) => this.toast.erreur(e),
    });
  }

  coefUe(ue: Ue) { return (ue.ecs ?? []).reduce((s, e) => s + e.coefficient, 0); }
}
