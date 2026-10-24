// Interfaces TypeScript correspondant aux réponses de l'API Laravel (organisation LMD)

export type Role = 'admin' | 'enseignant' | 'etudiant';
export type StatutUe = 'validee' | 'validee_rattrapage' | 'non_validee' | 'en_attente';

export interface User {
  id: number;
  prenom: string;
  nom: string;
  nom_complet: string;
  email: string;
  telephone?: string | null;
  role: Role;
  etudiant?: (Etudiant & { inscription?: Inscription | null }) | null;
  enseignant?: Enseignant | null;
}

// ---------- Offre de formation ----------
export interface Domaine { id: number; libelle: string; mentions?: Mention[]; }
export interface Mention { id: number; domaine_id: number; libelle: string; domaine?: Domaine; specialites?: Specialite[]; }
export interface Specialite {
  id: number; mention_id: number; code: string; libelle: string;
  mention?: Mention; classes_count?: number;
}

export interface Classe {
  id: number;
  specialite_id: number;
  libelle: string;
  grade: 'Licence' | 'Master';
  niveau: number;
  annee_academique: string;
  semestres: number[];          // ex. [5, 6] pour une L3
  specialite?: Specialite;
  inscriptions_count?: number;
  ues_count?: number;
}

// ---------- Programme ----------
export interface Ue {
  id: number; classe_id: number; code: string; libelle: string; credits: number; semestre: number;
  classe?: Classe; ecs?: Ec[];
}
export interface Ec {
  id: number; ue_id: number; libelle: string; coefficient: number; enseignant_id: number | null;
  enseignant?: Enseignant | null; ue?: Ue;
  // champs calculés dans l'espace enseignant
  effectif?: number; progression?: number;
}

// ---------- Personnes ----------
export interface Enseignant {
  id: number; user_id: number; matricule: string; specialite?: string | null;
  user?: User; ecs?: Ec[];
}
export interface Inscription { id: number; etudiant_id: number; classe_id: number; classe?: Classe; }
export interface Etudiant {
  id: number; user_id: number; matricule: string; sexe: 'M' | 'F';
  date_naissance?: string | null; lieu_naissance?: string | null;
  user?: User; inscription?: Inscription | null;
}

// ---------- Bulletin ----------
export interface LigneEc {
  ec_id: number; libelle: string; coefficient: number; enseignant: string | null;
  mcc: number | null; examen: number | null; rattrapage: number | null;
  moyenne: number | null; points: number | null; appreciation: string; examen_a_faire: boolean;
}
export interface LigneUe {
  ue_id: number; code: string; libelle: string; credits: number;
  total_coefficients: number; total_points: number; moyenne: number | null;
  statut: StatutUe; credits_obtenus: number; ecs: LigneEc[];
}
export interface RecapUe { code: string; moyenne: number | null; statut: StatutUe; credits_obtenus: number; }
export interface ResultatSemestre {
  semestre: number; ues: LigneUe[]; recapitulatif: RecapUe[];
  total_coefficients: number; total_points: number; moyenne: number | null; appreciation: string;
  credits_obtenus: number; credits_requis: number; decision: string;
}
export interface ResultatAnnuel {
  moyenne_s1: number | null; moyenne_s2: number | null; moyenne_generale: number | null;
  credits_s1: number; credits_s2: number; credits_total: number; credits_requis: number;
  appreciation: string; decision: string; delibere_le?: string | null;
}
export interface EnteteBulletin {
  annee_academique: string; classe: string; domaine: string | null; mention: string | null;
  specialite: string | null; grade: string; semestres: number[];
}
export interface Bulletin {
  entete: EnteteBulletin;
  etudiant: {
    id: number; identifiant: string; nom_complet: string; sexe: string;
    date_naissance: string | null; lieu_naissance: string | null;
  };
  semestre: number | null;
  semestres: ResultatSemestre[];
  semestre_precedent: ResultatSemestre | null;
  annuel: ResultatAnnuel | null;
}

// ---------- Résultats de classe ----------
export interface ResultatClasse {
  inscription_id: number; etudiant_id: number; identifiant: string; nom_complet: string;
  moyenne: number | null; credits: number; credits_requis: number;
  decision: string; appreciation: string; rang: number | null;
  moyenne_s1?: number | null; moyenne_s2?: number | null;
  credits_s1?: number; credits_s2?: number;
  ues_non_validees?: number; delibere?: boolean;
}

export interface NoteSaisie {
  inscription_id: number; identifiant: string; nom_complet: string;
  mcc: number | null; examen: number | null; rattrapage: number | null; moyenne: number | null;
}

export interface Dashboard {
  totaux: { etudiants: number; enseignants: number; classes: number; ues: number; ecs: number; notes: number };
  taux_reussite: number | null;
  par_classe: { classe: string; effectif: number; moyenne: number | null; taux_reussite: number | null }[];
  appreciations: Record<string, number>;
  meilleurs: (ResultatClasse & { classe: string })[];
}

export interface ResumeSemestre {
  semestre: number; moyenne: number | null; credits_obtenus: number; credits_requis: number;
  decision: string; ues_validees: number; ues_total: number;
}
export interface ResumeEtudiant {
  entete: EnteteBulletin;
  semestre_1: ResumeSemestre;
  semestre_2: ResumeSemestre;
  annuel: ResultatAnnuel;
}
