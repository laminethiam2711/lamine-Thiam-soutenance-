import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService, messageErreur } from '../../core/toast.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-entete">
      <div>
        <h1>Mon compte</h1>
        <p>{{ auth.user()?.nom_complet }} · {{ auth.user()?.email }}</p>
      </div>
    </div>

    <div class="carte" style="max-width: 520px">
      <div class="carte-entete"><h2>Changer de mot de passe</h2></div>
      <form class="carte-corps" (ngSubmit)="valider()" style="display:flex;flex-direction:column;gap:16px">
        @if (erreur()) { <div class="erreur-form" style="margin:0">{{ erreur() }}</div> }
        <div class="champ">
          <label>Mot de passe actuel</label>
          <input type="password" name="a" [(ngModel)]="form.ancien_mot_de_passe" required />
        </div>
        <div class="champ">
          <label>Nouveau mot de passe</label>
          <input type="password" name="n" [(ngModel)]="form.nouveau_mot_de_passe" required />
          <span class="aide">6 caractères minimum.</span>
        </div>
        <div class="champ">
          <label>Confirmer le nouveau mot de passe</label>
          <input type="password" name="c" [(ngModel)]="form.nouveau_mot_de_passe_confirmation" required />
        </div>
        <div><button class="btn btn-primaire" [disabled]="envoi()">Enregistrer</button></div>
      </form>
    </div>
  `,
})
export class ProfilComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  form = { ancien_mot_de_passe: '', nouveau_mot_de_passe: '', nouveau_mot_de_passe_confirmation: '' };
  envoi = signal(false);
  erreur = signal('');

  valider() {
    this.erreur.set('');
    if (this.form.nouveau_mot_de_passe !== this.form.nouveau_mot_de_passe_confirmation) {
      this.erreur.set('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    this.envoi.set(true);
    this.api.changerMotDePasse(this.form).subscribe({
      next: (r) => {
        this.toast.succes(r.message);
        this.form = { ancien_mot_de_passe: '', nouveau_mot_de_passe: '', nouveau_mot_de_passe_confirmation: '' };
        this.envoi.set(false);
      },
      error: (e) => { this.erreur.set(messageErreur(e)); this.envoi.set(false); },
    });
  }
}
