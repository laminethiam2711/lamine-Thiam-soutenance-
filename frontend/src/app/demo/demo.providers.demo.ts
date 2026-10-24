import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { RouterFeatures, withHashLocation } from '@angular/router';
import { delay, of, throwError } from 'rxjs';
import { ApiSimulee } from './api-simulee';

/**
 * VERSION DE DÉMONSTRATION EN LIGNE
 * Les requêtes vers l'API sont traitées dans le navigateur par ApiSimulee
 * au lieu d'être envoyées au serveur Laravel.
 */
const api = new ApiSimulee();

// Dans la page de démo, les boîtes de confirmation du navigateur sont bloquées :
// on considère que l'utilisateur confirme, et on masque les boutons « Imprimer ».
window.confirm = () => true;
const style = document.createElement('style');
style.textContent = '.bouton-imprimer { display: none !important; }';
document.head.appendChild(style);

const apiSimuleeInterceptor: HttpInterceptorFn = (req) => {
  const url = new URL(req.urlWithParams, 'http://demo.local');
  const chemin = url.pathname.replace(/^.*\/api/, '');
  const params: Record<string, string> = {};
  url.searchParams.forEach((valeur, cle) => (params[cle] = valeur));
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '') || null;
  const corps = JSON.parse(JSON.stringify(req.body ?? {}));

  const reponse = api.traiter(req.method, chemin, params, corps, token);
  const resultat = JSON.parse(JSON.stringify(reponse.body)); // copie : comme une vraie réponse réseau

  if (reponse.status >= 400) {
    return throwError(() => new HttpErrorResponse({ status: reponse.status, error: resultat, url: req.url }))
      .pipe(delay(150)) as any;
  }
  return of(new HttpResponse({ status: reponse.status, body: resultat, url: req.url })).pipe(delay(150));
};

export const demoInterceptors: HttpInterceptorFn[] = [apiSimuleeInterceptor];
export const demoRouterFeatures: RouterFeatures[] = [withHashLocation()];
