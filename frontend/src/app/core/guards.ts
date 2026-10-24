import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Bloque l'accès si l'utilisateur n'est pas connecté */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estConnecte() ? true : inject(Router).createUrlTree(['/login']);
};

/** Bloque l'accès si l'utilisateur n'a pas le bon rôle (renvoie vers son propre espace) */
export const roleGuard = (role: Role): CanActivateFn => () => {
  const auth = inject(AuthService);
  const user = auth.user();
  if (user?.role === role) return true;
  return inject(Router).createUrlTree([auth.accueil()]);
};

/** Un utilisateur déjà connecté qui ouvre /login est renvoyé vers son espace */
export const inviteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estConnecte() ? inject(Router).createUrlTree([auth.accueil()]) : true;
};
