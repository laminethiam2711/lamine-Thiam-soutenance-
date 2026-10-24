import { HttpInterceptorFn } from '@angular/common/http';
import { RouterFeatures } from '@angular/router';

/**
 * Version normale : aucune API simulée, l'application parle à Laravel.
 * Ce fichier est remplacé par demo.providers.demo.ts uniquement pour
 * la version de démonstration en ligne (ng build --configuration demo).
 */
export const demoInterceptors: HttpInterceptorFn[] = [];
export const demoRouterFeatures: RouterFeatures[] = [];
