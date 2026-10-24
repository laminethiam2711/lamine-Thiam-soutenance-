import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role, User } from './models';

const CLE_TOKEN = 'gn_token';
const CLE_USER = 'gn_user';

// Accès au localStorage protégé : il peut être indisponible (navigation privée…)
function lire(cle: string): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}
function ecrire(cle: string, valeur: string): void {
  try { localStorage.setItem(cle, valeur); } catch { /* ignoré */ }
}
function effacer(cle: string): void {
  try { localStorage.removeItem(cle); } catch { /* ignoré */ }
}

/**
 * Gère la connexion : stocke le jeton Sanctum et l'utilisateur dans le localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<User | null>(this.lireUser());
  readonly estConnecte = computed(() => this.user() !== null);

  get token(): string | null {
    return lire(CLE_TOKEN);
  }

  login(email: string, password: string): Observable<{ token: string; user: User }> {
    return this.http
      .post<{ token: string; user: User }>(`${environment.apiUrl}/login`, { email, password })
      .pipe(
        tap((rep) => {
          ecrire(CLE_TOKEN, rep.token);
          ecrire(CLE_USER, JSON.stringify(rep.user));
          this.user.set(rep.user);
        }),
      );
  }

  logout(): void {
    // On prévient l'API (suppression du jeton) puis on nettoie localement
    if (this.token) {
      this.http.post(`${environment.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    }
    this.nettoyer();
    this.router.navigate(['/login']);
  }

  nettoyer(): void {
    effacer(CLE_TOKEN);
    effacer(CLE_USER);
    this.user.set(null);
  }

  /** Page d'accueil selon le rôle */
  accueil(role: Role | undefined = this.user()?.role): string {
    switch (role) {
      case 'admin': return '/admin/tableau-de-bord';
      case 'enseignant': return '/enseignant/ecs';
      case 'etudiant': return '/etudiant/accueil';
      default: return '/login';
    }
  }

  private lireUser(): User | null {
    try {
      const brut = lire(CLE_USER);
      return brut && lire(CLE_TOKEN) ? (JSON.parse(brut) as User) : null;
    } catch {
      return null;
    }
  }
}
