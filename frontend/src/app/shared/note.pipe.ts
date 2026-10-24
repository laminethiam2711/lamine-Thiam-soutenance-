import { Pipe, PipeTransform } from '@angular/core';

/** Affiche un nombre à la française : 12.5 → « 12,50 » ; null → « — » */
@Pipe({ name: 'note', standalone: true })
export class NotePipe implements PipeTransform {
  transform(valeur: number | string | null | undefined, decimales = 2): string {
    if (valeur === null || valeur === undefined || valeur === '') return '—';
    return Number(valeur).toFixed(decimales).replace('.', ',');
  }
}
