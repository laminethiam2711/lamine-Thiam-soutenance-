import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

/** Redirige « / » vers l'espace correspondant au rôle de l'utilisateur */
@Component({ standalone: true, template: '' })
export class RedirectionComponent {
  constructor() {
    const auth = inject(AuthService);
    inject(Router).navigateByUrl(auth.accueil());
  }
}
