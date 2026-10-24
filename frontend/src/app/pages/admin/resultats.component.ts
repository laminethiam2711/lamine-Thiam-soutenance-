import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Classe, ResultatClasse } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { IconeComponent } from '../../shared/icone.component';
import { NotePipe } from '../../shared/note.pipe';
import { classeBadge, classeNote } from '../../shared/fonctions';

/**
 * Procès-verbal des résultats d'une classe : par semestre ou pour l'année.
 * La délibération enregistre le résultat annuel de chaque étudiant.
 */
@Component({
  selector: 'app-resultats',
  standalone: true,
  imports: [FormsModule, RouterLink, NotePipe, IconeComponent, ChargementComponent],
  templateUrl: './resultats.component.html',
})
export class ResultatsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  classes = signal<Classe[]>([]);
  classeId = signal<number | null>(null);
  semestre = signal<number | null>(null);       // null = résultats annuels
  resultats = signal<ResultatClasse[] | null>(null);
  deliberation = signal(false);
  confirmation = signal(false);
  classeBadge = classeBadge;
  classeNote = classeNote;

  classe = computed(() => this.classes().find((c) => c.id === this.classeId()) ?? null);
  annuel = computed(() => this.semestre() === null);

  resume = computed(() => {
    const r = (this.resultats() ?? []).filter((x) => x.moyenne !== null);
    const admis = r.filter((x) => this.annuel() ? x.decision.startsWith('Admis') : (x.moyenne as number) >= 10).length;
    const moyennes = r.map((x) => x.moyenne as number);
    return {
      admis,
      autres: r.length - admis,
      attente: (this.resultats() ?? []).length - r.length,
      taux: r.length ? Math.round((admis / r.length) * 100) : 0,
      moyenne: moyennes.length ? Math.floor((moyennes.reduce((a, b) => a + b, 0) / moyennes.length) * 100) / 100 : null,
      delibere: (this.resultats() ?? []).some((x) => x.delibere),
    };
  });

  ngOnInit() {
    this.api.classes().subscribe((c) => {
      this.classes.set(c);
      if (c.length) { this.classeId.set(c[c.length - 1].id); this.charger(); } else { this.resultats.set([]); }
    });
  }

  changerClasse(id: number) { this.classeId.set(id); this.semestre.set(null); this.charger(); }
  choisirSemestre(s: number | null) { this.semestre.set(s); this.charger(); }

  charger() {
    const id = this.classeId();
    if (!id) return;
    this.resultats.set(null);
    this.confirmation.set(false);
    this.api.resultatsClasse(id, this.semestre()).subscribe({
      next: (r) => this.resultats.set(r.resultats),
      error: (e) => this.toast.erreur(e),
    });
  }

  deliberer() {
    const id = this.classeId();
    if (!id) return;
    this.deliberation.set(true);
    this.api.deliberer(id).subscribe({
      next: (r) => { this.toast.succes(r.message); this.deliberation.set(false); this.charger(); },
      error: (e) => { this.toast.erreur(e); this.deliberation.set(false); this.confirmation.set(false); },
    });
  }

  imprimer() { window.print(); }
}
