import { Routes } from '@angular/router';
import { authGuard, inviteGuard, roleGuard } from './core/guards';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [inviteGuard], title: 'Connexion' },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      // ---------- Administrateur ----------
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        children: [
          { path: 'tableau-de-bord', title: 'Tableau de bord',
            loadComponent: () => import('./pages/admin/dashboard.component').then((m) => m.DashboardComponent) },
          { path: 'classes', title: 'Classes',
            loadComponent: () => import('./pages/admin/classes.component').then((m) => m.ClassesComponent) },
          { path: 'formations', title: 'Formations',
            loadComponent: () => import('./pages/admin/formations.component').then((m) => m.FormationsComponent) },
          { path: 'programme', title: 'UE et EC',
            loadComponent: () => import('./pages/admin/programme.component').then((m) => m.ProgrammeComponent) },
          { path: 'etudiants', title: 'Étudiants',
            loadComponent: () => import('./pages/admin/etudiants.component').then((m) => m.EtudiantsComponent) },
          { path: 'enseignants', title: 'Enseignants',
            loadComponent: () => import('./pages/admin/enseignants.component').then((m) => m.EnseignantsComponent) },
          { path: 'resultats', title: 'Résultats',
            loadComponent: () => import('./pages/admin/resultats.component').then((m) => m.ResultatsComponent) },
          { path: 'etudiants/:id/bulletin', title: 'Bulletin',
            loadComponent: () => import('./pages/admin/bulletin-etudiant.component').then((m) => m.BulletinEtudiantComponent) },
          { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
        ],
      },

      // ---------- Enseignant ----------
      {
        path: 'enseignant',
        canActivate: [roleGuard('enseignant')],
        children: [
          { path: 'ecs', title: 'Mes enseignements',
            loadComponent: () => import('./pages/enseignant/mes-matieres.component').then((m) => m.MesMatieresComponent) },
          { path: 'ecs/:id/notes', title: 'Saisie des notes',
            loadComponent: () => import('./pages/enseignant/saisie-notes.component').then((m) => m.SaisieNotesComponent) },
          { path: '', redirectTo: 'ecs', pathMatch: 'full' },
        ],
      },

      // ---------- Étudiant ----------
      {
        path: 'etudiant',
        canActivate: [roleGuard('etudiant')],
        children: [
          { path: 'accueil', title: 'Accueil',
            loadComponent: () => import('./pages/etudiant/accueil.component').then((m) => m.AccueilEtudiantComponent) },
          { path: 'bulletin', title: 'Mon bulletin',
            loadComponent: () => import('./pages/etudiant/mon-bulletin.component').then((m) => m.MonBulletinComponent) },
          { path: '', redirectTo: 'accueil', pathMatch: 'full' },
        ],
      },

      // ---------- Commun ----------
      { path: 'profil', title: 'Mot de passe',
        loadComponent: () => import('./pages/profil/profil.component').then((m) => m.ProfilComponent) },

      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/redirection.component').then((m) => m.RedirectionComponent) },
    ],
  },

  { path: '**', redirectTo: '' },
];
