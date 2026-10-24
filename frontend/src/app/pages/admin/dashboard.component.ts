import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Dashboard } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { ChargementComponent } from '../../shared/chargement.component';
import { NotePipe } from '../../shared/note.pipe';
import { classeBadge, classeNote } from '../../shared/fonctions';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NotePipe, ChargementComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  data = signal<Dashboard | null>(null);
  classeBadge = classeBadge;
  classeNote = classeNote;

  /** Répartition des appréciations (moyenne générale) avec pourcentage pour les barres */
  mentions = computed(() => {
    const m = this.data()?.appreciations ?? {};
    const total = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m).map(([libelle, nombre]) => ({ libelle, nombre, pct: Math.round((nombre / total) * 100) }));
  });

  ngOnInit() {
    this.api.dashboard().subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.toast.erreur(e),
    });
  }
}
