import { StatutUe } from '../core/models';

/** Classe CSS d'un badge selon l'appréciation ou la décision */
export function classeBadge(texte: string | null | undefined): string {
  const t = texte ?? '';
  if (t.startsWith('Admis') || ['Très bien', 'Bien', 'Travail Très bien', 'Travail Bien'].includes(t)) return 'badge badge-vert';
  if (['Assez bien', 'Passable', 'Travail Assez bien', 'Travail Passable'].includes(t)) return 'badge badge-bleu';
  if (t.startsWith('Ajourné') || ['Insuffisant', 'Médiocre', 'Travail Insuffisant', 'Travail Médiocre'].includes(t)) return 'badge badge-rouge';
  if (t === 'En attente') return 'badge badge-or';
  return 'badge badge-gris';
}

/** Classe CSS d'une note (vert si ≥ 10, rouge sinon) */
export function classeNote(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return n >= 10 ? 'note-ok' : 'note-ko';
}

export const LIBELLE_STATUT: Record<StatutUe, string> = {
  validee: 'Validée',
  validee_rattrapage: 'Validée (R)',
  non_validee: 'Non validée',
  en_attente: 'Examen(s) à faire',
};

export function classeStatut(s: StatutUe): string {
  return {
    validee: 'badge badge-vert',
    validee_rattrapage: 'badge badge-bleu',
    non_validee: 'badge badge-rouge',
    en_attente: 'badge badge-or',
  }[s];
}

/** Libellé d'un niveau : 3 → « L3 » */
export const libelleNiveau = (grade: string, niveau: number) => `${grade === 'Master' ? 'M' : 'L'}${niveau}`;
