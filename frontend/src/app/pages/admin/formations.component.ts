import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Domaine, Mention, Specialite } from '../../core/models';
import { ToastService, messageErreur } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { ModalComponent } from '../../shared/modal.component';

type Type = 'domaine' | 'mention' | 'specialite';

/**
 * Offre de formation : Domaine > Mention > Spécialité.
 * (ex. Sciences et Technologies > Informatique > IAGE)
 */
@Component({
  selector: 'app-formations',
  standalone: true,
  imports: [FormsModule, IconeComponent, ModalComponent, ChargementComponent],
  templateUrl: './formations.component.html',
  styles: [`
    .domaine { margin-bottom: 20px; }
    .domaine > .carte-entete h2 small { font-weight: 500; color: var(--texte-doux); margin-left: 6px; font-size: 13px; }
    .mention { border-top: 1px solid var(--bordure); }
    .mention:first-of-type { border-top: none; }
    .tete-mention { display: flex; align-items: center; gap: 10px; padding: 12px 20px; background: var(--bleu-tres-pale); }
    .tete-mention h3 { font-size: 14.5px; flex: 1; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--texte-doux); }
    .code { font-weight: 700; color: var(--navy-800); }
    .boutons { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-petit { height: 32px; padding: 0 12px; font-size: 13px; }
  `],
})
export class FormationsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  domaines = signal<Domaine[] | null>(null);
  modal = signal<Type | null>(null);
  enCours = signal(false);
  erreur = signal('');
  editionId: number | null = null;
  form: any = {};

  titres: Record<Type, string> = { domaine: 'domaine', mention: 'mention', specialite: 'spécialité' };

  ngOnInit() { this.charger(); }

  charger() {
    this.api.domaines().subscribe({ next: (d) => this.domaines.set(d), error: (e) => this.toast.erreur(e) });
  }

  /** Toutes les mentions, pour la liste déroulante du formulaire de spécialité */
  mentions(): (Mention & { domaine_libelle: string })[] {
    return (this.domaines() ?? []).flatMap((d) => (d.mentions ?? []).map((m) => ({ ...m, domaine_libelle: d.libelle })));
  }

  ouvrir(type: Type, objet?: Domaine | Mention | Specialite, parentId?: number) {
    this.editionId = objet?.id ?? null;
    if (type === 'domaine') this.form = { libelle: (objet as Domaine)?.libelle ?? '' };
    if (type === 'mention') {
      const m = objet as Mention | undefined;
      this.form = { libelle: m?.libelle ?? '', domaine_id: m?.domaine_id ?? parentId ?? this.domaines()?.[0]?.id };
    }
    if (type === 'specialite') {
      const s = objet as Specialite | undefined;
      this.form = { code: s?.code ?? '', libelle: s?.libelle ?? '', mention_id: s?.mention_id ?? parentId ?? this.mentions()[0]?.id };
    }
    this.erreur.set('');
    this.modal.set(type);
  }

  enregistrer() {
    const type = this.modal()!;
    const id = this.editionId;
    const requetes = {
      domaine: () => (id ? this.api.modifierDomaine(id, this.form) : this.api.creerDomaine(this.form)),
      mention: () => (id ? this.api.modifierMention(id, this.form) : this.api.creerMention(this.form)),
      specialite: () => (id ? this.api.modifierSpecialite(id, this.form) : this.api.creerSpecialite(this.form)),
    };
    this.enCours.set(true);
    (requetes[type]() as any).subscribe({
      next: () => {
        this.toast.succes(id ? 'Modification enregistrée.' : 'Ajout enregistré.');
        this.modal.set(null);
        this.enCours.set(false);
        this.charger();
      },
      error: (e: unknown) => { this.erreur.set(messageErreur(e)); this.enCours.set(false); },
    });
  }

  supprimer(type: Type, objet: { id: number; libelle: string }) {
    if (!confirm(`Supprimer « ${objet.libelle} » ?`)) return;
    const requete = { domaine: this.api.supprimerDomaine(objet.id), mention: this.api.supprimerMention(objet.id),
      specialite: this.api.supprimerSpecialite(objet.id) }[type];
    requete.subscribe({
      next: (r) => { this.toast.succes(r.message); this.charger(); },
      error: (e) => this.toast.erreur(e),
    });
  }
}
