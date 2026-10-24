import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Bulletin, Classe, Dashboard, Domaine, Ec, Enseignant, Etudiant, Mention,
  NoteSaisie, ResultatClasse, ResumeEtudiant, Specialite, Ue,
} from './models';

type Message = { message: string };

/** Regroupe tous les appels à l'API Laravel */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;

  private params(filtres: Record<string, any> = {}): HttpParams {
    let p = new HttpParams();
    for (const [cle, valeur] of Object.entries(filtres)) {
      if (valeur !== null && valeur !== undefined && valeur !== '') p = p.set(cle, valeur);
    }
    return p;
  }

  // ---------- Administrateur ----------
  dashboard(): Observable<Dashboard> { return this.http.get<Dashboard>(`${this.url}/dashboard`); }

  // Offre de formation
  domaines(): Observable<Domaine[]> { return this.http.get<Domaine[]>(`${this.url}/domaines`); }
  creerDomaine(d: Partial<Domaine>) { return this.http.post<Domaine>(`${this.url}/domaines`, d); }
  modifierDomaine(id: number, d: Partial<Domaine>) { return this.http.put<Domaine>(`${this.url}/domaines/${id}`, d); }
  supprimerDomaine(id: number) { return this.http.delete<Message>(`${this.url}/domaines/${id}`); }

  creerMention(m: Partial<Mention>) { return this.http.post<Mention>(`${this.url}/mentions`, m); }
  modifierMention(id: number, m: Partial<Mention>) { return this.http.put<Mention>(`${this.url}/mentions/${id}`, m); }
  supprimerMention(id: number) { return this.http.delete<Message>(`${this.url}/mentions/${id}`); }

  specialites(): Observable<Specialite[]> { return this.http.get<Specialite[]>(`${this.url}/specialites`); }
  creerSpecialite(s: Partial<Specialite>) { return this.http.post<Specialite>(`${this.url}/specialites`, s); }
  modifierSpecialite(id: number, s: Partial<Specialite>) { return this.http.put<Specialite>(`${this.url}/specialites/${id}`, s); }
  supprimerSpecialite(id: number) { return this.http.delete<Message>(`${this.url}/specialites/${id}`); }

  // Classes
  classes(): Observable<Classe[]> { return this.http.get<Classe[]>(`${this.url}/classes`); }
  creerClasse(c: Partial<Classe>) { return this.http.post<Classe>(`${this.url}/classes`, c); }
  modifierClasse(id: number, c: Partial<Classe>) { return this.http.put<Classe>(`${this.url}/classes/${id}`, c); }
  supprimerClasse(id: number) { return this.http.delete<Message>(`${this.url}/classes/${id}`); }
  resultatsClasse(id: number, semestre?: number | null) {
    return this.http.get<{ classe: Classe; semestre: number | null; resultats: ResultatClasse[] }>(
      `${this.url}/classes/${id}/resultats`, { params: this.params({ semestre }) });
  }
  deliberer(id: number) { return this.http.post<Message>(`${this.url}/classes/${id}/deliberation`, {}); }

  // Programme : UE et EC
  ues(filtres: { classe_id?: number | null; semestre?: number | null } = {}): Observable<Ue[]> {
    return this.http.get<Ue[]>(`${this.url}/ues`, { params: this.params(filtres) });
  }
  creerUe(u: Partial<Ue>) { return this.http.post<Ue>(`${this.url}/ues`, u); }
  modifierUe(id: number, u: Partial<Ue>) { return this.http.put<Ue>(`${this.url}/ues/${id}`, u); }
  supprimerUe(id: number) { return this.http.delete<Message>(`${this.url}/ues/${id}`); }
  creerEc(e: Partial<Ec>) { return this.http.post<Ec>(`${this.url}/ecs`, e); }
  modifierEc(id: number, e: Partial<Ec>) { return this.http.put<Ec>(`${this.url}/ecs/${id}`, e); }
  supprimerEc(id: number) { return this.http.delete<Message>(`${this.url}/ecs/${id}`); }

  // Étudiants
  etudiants(filtres: { classe_id?: number | null; recherche?: string } = {}): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.url}/etudiants`, { params: this.params(filtres) });
  }
  creerEtudiant(e: any) { return this.http.post<Etudiant>(`${this.url}/etudiants`, e); }
  modifierEtudiant(id: number, e: any) { return this.http.put<Etudiant>(`${this.url}/etudiants/${id}`, e); }
  supprimerEtudiant(id: number) { return this.http.delete<Message>(`${this.url}/etudiants/${id}`); }
  bulletinEtudiant(id: number, semestre?: number | null): Observable<Bulletin> {
    return this.http.get<Bulletin>(`${this.url}/etudiants/${id}/bulletin`, { params: this.params({ semestre }) });
  }

  // Enseignants
  enseignants(): Observable<Enseignant[]> { return this.http.get<Enseignant[]>(`${this.url}/enseignants`); }
  creerEnseignant(e: any) { return this.http.post<Enseignant>(`${this.url}/enseignants`, e); }
  modifierEnseignant(id: number, e: any) { return this.http.put<Enseignant>(`${this.url}/enseignants/${id}`, e); }
  supprimerEnseignant(id: number) { return this.http.delete<Message>(`${this.url}/enseignants/${id}`); }

  // ---------- Enseignant ----------
  mesEcs(): Observable<Ec[]> { return this.http.get<Ec[]>(`${this.url}/enseignant/ecs`); }
  notesEc(id: number) {
    return this.http.get<{ ec: Ec; etudiants: NoteSaisie[] }>(`${this.url}/enseignant/ecs/${id}/notes`);
  }
  enregistrerNotes(id: number, notes: Pick<NoteSaisie, 'inscription_id' | 'mcc' | 'examen' | 'rattrapage'>[]) {
    return this.http.post<Message>(`${this.url}/enseignant/ecs/${id}/notes`, { notes });
  }

  // ---------- Étudiant ----------
  monBulletin(semestre?: number | null): Observable<Bulletin> {
    return this.http.get<Bulletin>(`${this.url}/etudiant/bulletin`, { params: this.params({ semestre }) });
  }
  monResume(): Observable<ResumeEtudiant> { return this.http.get<ResumeEtudiant>(`${this.url}/etudiant/resume`); }

  // ---------- Commun ----------
  changerMotDePasse(d: { ancien_mot_de_passe: string; nouveau_mot_de_passe: string; nouveau_mot_de_passe_confirmation: string }) {
    return this.http.put<Message>(`${this.url}/mot-de-passe`, d);
  }
}
