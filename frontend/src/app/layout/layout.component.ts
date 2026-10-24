import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { IconeComponent } from '../shared/icone.component';

interface LienMenu { libelle: string; lien: string; icone: string; }

/**
 * Mise en page principale : barre latérale bleu foncé + contenu.
 * Le menu change selon le rôle de l'utilisateur connecté.
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconeComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  auth = inject(AuthService);
  menuOuvert = signal(false);

  private menus: Record<string, LienMenu[]> = {
    admin: [
      { libelle: 'Tableau de bord', lien: '/admin/tableau-de-bord', icone: 'tableau' },
      { libelle: 'Formations', lien: '/admin/formations', icone: 'diplome' },
      { libelle: 'Classes', lien: '/admin/classes', icone: 'classe' },
      { libelle: 'UE et EC', lien: '/admin/programme', icone: 'livre' },
      { libelle: 'Étudiants', lien: '/admin/etudiants', icone: 'etudiants' },
      { libelle: 'Enseignants', lien: '/admin/enseignants', icone: 'enseignant' },
      { libelle: 'Résultats', lien: '/admin/resultats', icone: 'resultats' },
    ],
    enseignant: [
      { libelle: 'Mes enseignements', lien: '/enseignant/ecs', icone: 'livre' },
    ],
    etudiant: [
      { libelle: 'Accueil', lien: '/etudiant/accueil', icone: 'accueil' },
      { libelle: 'Mon bulletin', lien: '/etudiant/bulletin', icone: 'bulletin' },
    ],
  };

  liens = computed(() => this.menus[this.auth.user()?.role ?? ''] ?? []);

  libelleRole = computed(() => ({
    admin: 'Administrateur',
    enseignant: 'Enseignant',
    etudiant: 'Étudiant',
  })[this.auth.user()?.role ?? 'etudiant']);

  initiales = computed(() => {
    const u = this.auth.user();
    return u ? (u.prenom[0] + u.nom[0]).toUpperCase() : '';
  });

  constructor() {
    // Ferme le menu mobile après un changement de page
    inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOuvert.set(false));
  }
}
