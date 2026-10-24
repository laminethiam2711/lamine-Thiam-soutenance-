import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Enseignant } from '../../core/models';
import { ToastService, messageErreur } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-enseignants',
  standalone: true,
  imports: [FormsModule, IconeComponent, ModalComponent, ChargementComponent],
  templateUrl: './enseignants.component.html',
})
export class EnseignantsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  enseignants = signal<Enseignant[] | null>(null);
  modalOuvert = signal(false);
  enCours = signal(false);
  erreur = signal('');
  edition: Enseignant | null = null;
  form: any = {};

  ngOnInit() { this.charger(); }

  charger() {
    this.api.enseignants().subscribe({ next: (e) => this.enseignants.set(e), error: (e) => this.toast.erreur(e) });
  }

  ouvrir(e?: Enseignant) {
    this.edition = e ?? null;
    this.form = e
      ? { prenom: e.user?.prenom, nom: e.user?.nom, email: e.user?.email, telephone: e.user?.telephone,
          matricule: e.matricule, specialite: e.specialite, password: '' }
      : { prenom: '', nom: '', email: '', telephone: '', matricule: '', specialite: '', password: '' };
    this.erreur.set('');
    this.modalOuvert.set(true);
  }

  enregistrer() {
    this.enCours.set(true);
    const donnees = { ...this.form };
    if (!donnees.password) delete donnees.password;

    const requete = this.edition
      ? this.api.modifierEnseignant(this.edition.id, donnees)
      : this.api.creerEnseignant(donnees);

    requete.subscribe({
      next: () => {
        this.toast.succes(this.edition ? 'Enseignant modifié.' : 'Enseignant ajouté.');
        this.modalOuvert.set(false);
        this.enCours.set(false);
        this.charger();
      },
      error: (err) => { this.erreur.set(messageErreur(err)); this.enCours.set(false); },
    });
  }

  supprimer(e: Enseignant) {
    if (!confirm(`Supprimer l'enseignant « ${e.user?.nom_complet} » ? Ses EC n'auront plus d'enseignant.`)) return;
    this.api.supprimerEnseignant(e.id).subscribe({
      next: () => { this.toast.succes('Enseignant supprimé.'); this.charger(); },
      error: (err) => this.toast.erreur(err),
    });
  }
}
