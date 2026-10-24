import { Component, input } from '@angular/core';

@Component({
  selector: 'app-chargement',
  standalone: true,
  template: `<div class="chargement"><div class="spinner"></div>{{ texte() }}</div>`,
})
export class ChargementComponent {
  texte = input('Chargement…');
}
