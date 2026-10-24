import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { messageErreur } from '../../core/toast.service';
import { IconeComponent } from '../../shared/icone.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconeComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  demo = environment.demo;
  email = '';
  password = '';
  chargement = signal(false);
  erreur = signal('');

  // Comptes de démonstration (créés par le seeder) — pratique pour la soutenance
  comptesDemo = [
    { role: 'Administrateur', email: 'admin@ecole.sn', password: 'admin123' },
    { role: 'Enseignant', email: 'moussa.diop@ecole.sn', password: 'passer123' },
    { role: 'Étudiant', email: 'fatou.sow@ecole.sn', password: 'passer123' },
  ];

  remplir(c: { email: string; password: string }) {
    this.email = c.email;
    this.password = c.password;
    this.erreur.set('');
  }

  connexion() {
    if (!this.email || !this.password) {
      this.erreur.set('Veuillez saisir votre email et votre mot de passe.');
      return;
    }
    this.chargement.set(true);
    this.erreur.set('');

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (rep) => this.router.navigateByUrl(this.auth.accueil(rep.user.role)),
      error: (err) => {
        this.erreur.set(messageErreur(err, 'Connexion impossible.'));
        this.chargement.set(false);
      },
    });
  }
}
