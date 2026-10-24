import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Classe, Etudiant } from '../../core/models';
import { ToastService, messageErreur } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-etudiants',
  standalone: true,
  imports: [FormsModule, RouterLink, IconeComponent, ModalComponent, ChargementComponent],
  templateUrl: './etudiants.component.html',
})
export class EtudiantsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  etudiants = signal<Etudiant[] | null>(null);
  classes = signal<Classe[]>([]);
  filtreClasse: number | null = null;
  recherche = '';
  private recherche$ = new Subject<void>();

  modalOuvert = signal(false);
  enCours = signal(false);
  erreur = signal('');
  edition: Etudiant | null = null;
  form: any = {};

  constructor() {
    // On attend que l'utilisateur arrête de taper avant d'interroger l'API
    this.recherche$.pipe(debounceTime(300)).subscribe(() => this.charger());
  }

  ngOnInit() {
    this.api.classes().subscribe((c) => this.classes.set(c));
    this.charger();
  }

  rechercher() { this.recherche$.next(); }

  charger() {
    this.api.etudiants({ classe_id: this.filtreClasse, recherche: this.recherche }).subscribe({
      next: (e) => this.etudiants.set(e),
      error: (e) => this.toast.erreur(e),
    });
  }

  ouvrir(e?: Etudiant) {
    this.edition = e ?? null;
    this.form = e
      ? {
          prenom: e.user?.prenom, nom: e.user?.nom, email: e.user?.email, telephone: e.user?.telephone,
          matricule: e.matricule, sexe: e.sexe, classe_id: e.inscription?.classe_id, date_naissance: e.date_naissance,
          lieu_naissance: e.lieu_naissance, password: '',
        }
      : {
          prenom: '', nom: '', email: '', telephone: '', matricule: '', sexe: 'M',
          classe_id: this.filtreClasse ?? this.classes()[0]?.id, date_naissance: '', lieu_naissance: '', password: '',
        };
    this.erreur.set('');
    this.modalOuvert.set(true);
  }

  enregistrer() {
    this.enCours.set(true);
    const donnees = { ...this.form };
    if (!donnees.password) delete donnees.password;
    if (!donnees.date_naissance) donnees.date_naissance = null;

    const requete = this.edition
      ? this.api.modifierEtudiant(this.edition.id, donnees)
      : this.api.creerEtudiant(donnees);

    requete.subscribe({
      next: () => {
        this.toast.succes(this.edition ? 'Étudiant modifié.' : 'Étudiant inscrit.');
        this.modalOuvert.set(false);
        this.enCours.set(false);
        this.charger();
      },
      error: (err) => { this.erreur.set(messageErreur(err)); this.enCours.set(false); },
    });
  }

  supprimer(e: Etudiant) {
    if (!confirm(`Supprimer l'étudiant « ${e.user?.nom_complet} » et toutes ses notes ?`)) return;
    this.api.supprimerEtudiant(e.id).subscribe({
      next: () => { this.toast.succes('Étudiant supprimé.'); this.charger(); },
      error: (err) => this.toast.erreur(err),
    });
  }
}
