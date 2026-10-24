import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface Toast { id: number; type: 'succes' | 'erreur'; texte: string; }

/**
 * Petits messages de confirmation / d'erreur affichés en bas de l'écran.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private compteur = 0;

  succes(texte: string) { this.ajouter('succes', texte); }

  erreur(err: unknown, defaut = 'Une erreur est survenue.') {
    this.ajouter('erreur', messageErreur(err, defaut));
  }

  fermer(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }

  private ajouter(type: Toast['type'], texte: string) {
    const id = ++this.compteur;
    this.toasts.update((t) => [...t, { id, type, texte }]);
    setTimeout(() => this.fermer(id), 4000);
  }
}

/** Extrait un message lisible d'une erreur renvoyée par Laravel */
export function messageErreur(err: unknown, defaut = 'Une erreur est survenue.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return "Impossible de joindre l'API. Vérifiez que « php artisan serve » est lancé.";
    const erreurs = err.error?.errors;
    if (erreurs) {
      const premiere = Object.values(erreurs)[0] as string[];
      if (premiere?.length) return premiere[0];
    }
    if (err.error?.message) return err.error.message;
  }
  return defaut;
}
