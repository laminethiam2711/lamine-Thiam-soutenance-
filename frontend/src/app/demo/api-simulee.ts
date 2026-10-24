/**
 * API SIMULÉE — utilisée uniquement par la version de démonstration en ligne.
 *
 * Elle reproduit les routes de l'API Laravel (routes/api.php) et les règles de
 * CalculMoyenneService, à partir des mêmes données que le seeder (donnees-demo.json).
 * Les données vivent en mémoire : elles reviennent à l'état initial au rechargement.
 */
import donneesDemo from './donnees-demo.json';

type Obj = Record<string, any>;
export interface Reponse { status: number; body: any; }

// =====================================================================
// Règles de calcul : copie de CalculMoyenneService.php
// =====================================================================
const arrondi = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const tronquer = (x: number, d = 2) => Math.floor(x * 10 ** d + 1e-7) / 10 ** d;

function moyenneEc(mcc: number | null, examen: number | null, ratt: number | null): number | null {
  const retenu = ratt !== null && (examen === null || ratt > examen) ? ratt : examen;
  if (retenu === null) return null;
  if (mcc === null) return arrondi(retenu);
  return arrondi(mcc * 0.4 + retenu * 0.6);
}
function appreciation(m: number | null): string {
  if (m === null) return '';
  return m >= 16 ? 'Très bien' : m >= 14 ? 'Bien' : m >= 12 ? 'Assez bien' : m >= 10 ? 'Passable' : m >= 8 ? 'Insuffisant' : 'Médiocre';
}
const decisionSemestre = (m: number | null) => (m === null ? 'En attente' : 'Travail ' + appreciation(m));
function decisionAnnuelle(m: number | null, credits: number, requis: number, niveau: number): string {
  if (m === null) return 'En attente';
  if (credits >= requis) return niveau >= 3 ? 'Admis(e) — Licence validée' : 'Admis(e) en classe supérieure';
  return 'Ajourné(e)';
}
const numeroUe = (code: string) => Number(/(\d+)\s*$/.exec(code)?.[1] ?? Number.MAX_SAFE_INTEGER);

export class ApiSimulee {
  private t: Record<string, Obj[]> = JSON.parse(JSON.stringify(donneesDemo));
  private resultatsAnnuels: Obj[] = [];

  // ---------- Accès aux tables ----------
  private table(nom: string) { return this.t[nom]; }
  private trouver(nom: string, id: number) { return this.t[nom].find((x: any) => x['id'] === id) ?? null; }
  private nouvelId(nom: string) { return Math.max(0, ...this.t[nom].map((x: any) => x['id'])) + 1; }
  private inserer(nom: string, ligne: Obj) { const r = { id: this.nouvelId(nom), ...ligne }; this.t[nom].push(r); return r; }

  // ---------- Relations (équivalent de ->with(...)) ----------
  private user(id: number): any {
    const u = this.trouver('users', id);
    if (!u) return null;
    const { password, ...reste } = u;
    return { ...reste, nom_complet: `${u['prenom']} ${u['nom']}` };
  }
  private classe(id: number): any {
    const c = this.trouver('classes', id);
    return c ? { ...c, semestres: [c['niveau'] * 2 - 1, c['niveau'] * 2] } : null;
  }
  private classeComplete(id: number): any {
    const c = this.classe(id);
    if (!c) return null;
    const s = this.trouver('specialites', c['specialite_id']);
    const m = s ? this.trouver('mentions', s['mention_id']) : null;
    const d = m ? this.trouver('domaines', m['domaine_id']) : null;
    return { ...c, specialite: s ? { ...s, mention: m ? { ...m, domaine: d } : null } : null };
  }
  private enseignant(id: number | null): any {
    const e = id ? this.trouver('enseignants', id) : null;
    return e ? { ...e, user: this.user(e['user_id']) } : null;
  }
  private uesDeLaClasse(classeId: number): any {
    return this.table('ues').filter((u: any) => u['classe_id'] === classeId)
      .sort((a: any, b: any) => a['code'].localeCompare(b['code']))
      .map((u: any) => ({ ...u, ecs: this.table('ecs').filter((e: any) => e['ue_id'] === u['id']).map((e: any) => ({ ...e, enseignant: this.enseignant(e['enseignant_id']) })) }));
  }
  private inscription(etudiantId: number): any {
    const liste = this.table('inscriptions').filter((i: any) => i['etudiant_id'] === etudiantId);
    return liste.length ? liste[liste.length - 1] : null;
  }
  private etudiantComplet(e: Obj): any {
    const i = this.inscription(e['id']);
    return { ...e, user: this.user(e['user_id']), inscription: i ? { ...i, classe: this.classe(i['classe_id']) } : null };
  }
  private notesDe(inscriptionId: number) {
    const m = new Map<number, Obj>();
    this.table('notes').filter((n: any) => n['inscription_id'] === inscriptionId).forEach((n: any) => m.set(n['ec_id'], n));
    return m;
  }

  // =====================================================================
  // Calculs (copie de CalculMoyenneService)
  // =====================================================================
  private resultatSemestre(semestre: number, ues: Obj[], notes: Map<number, Obj>): any {
    const lignes: Obj[] = [];
    let somme = 0, totalCoef = 0, totalPoints = 0, credits = 0, requis = 0, complet = true;

    for (const ue of ues.filter((u: any) => u['semestre'] === semestre)) {
      let pointsUe = 0, coefUe = 0, aFaire = false, rattrapage = false;
      const ecs = ue['ecs'].map((ec: Obj): any => {
        const n = notes.get(ec['id']);
        const mcc = n?.['mcc'] ?? null, examen = n?.['examen'] ?? null, ratt = n?.['rattrapage'] ?? null;
        const moyenne = moyenneEc(mcc, examen, ratt);
        const points = moyenne !== null ? arrondi(moyenne * ec['coefficient']) : null;
        if (moyenne === null) aFaire = true; else pointsUe += points!;
        coefUe += ec['coefficient'];
        if (ratt !== null) rattrapage = true;
        return {
          ec_id: ec['id'], libelle: ec['libelle'], coefficient: ec['coefficient'],
          enseignant: ec['enseignant']?.user?.nom_complet ?? null,
          mcc, examen, rattrapage: ratt, moyenne, points, appreciation: appreciation(moyenne), examen_a_faire: moyenne === null,
        };
      });
      const moyenneUe = !aFaire && coefUe > 0 ? arrondi(pointsUe / coefUe, 3) : null;
      const statut = moyenneUe === null ? 'en_attente' : moyenneUe < 10 ? 'non_validee' : rattrapage ? 'validee_rattrapage' : 'validee';
      const obtenus = statut.startsWith('validee') ? ue['credits'] : 0;
      lignes.push({
        ue_id: ue['id'], code: ue['code'], libelle: ue['libelle'], credits: ue['credits'],
        total_coefficients: coefUe, total_points: arrondi(pointsUe), moyenne: moyenneUe, statut, credits_obtenus: obtenus, ecs,
      });
      if (moyenneUe === null) complet = false; else somme += moyenneUe * coefUe;
      totalCoef += coefUe; totalPoints += pointsUe; credits += obtenus; requis += ue['credits'];
    }
    const moyenne = complet && totalCoef > 0 ? tronquer(somme / totalCoef) : null;
    const recapitulatif = [...lignes].sort((a: any, b: any) => numeroUe(a['code']) - numeroUe(b['code'])).map((l: any) => ({
      code: l['code'], moyenne: l['moyenne'] !== null ? tronquer(l['moyenne']) : null, statut: l['statut'], credits_obtenus: l['credits_obtenus'],
    }));
    return {
      semestre, ues: lignes, recapitulatif, total_coefficients: totalCoef, total_points: arrondi(totalPoints),
      moyenne, appreciation: appreciation(moyenne), credits_obtenus: credits, credits_requis: requis, decision: decisionSemestre(moyenne),
    };
  }

  private resultatAnnuel(s1: Obj, s2: Obj, niveau: number): any {
    const m = s1['moyenne'] !== null && s2['moyenne'] !== null ? tronquer((s1['moyenne'] + s2['moyenne']) / 2) : null;
    const credits = s1['credits_obtenus'] + s2['credits_obtenus'];
    const requis = s1['credits_requis'] + s2['credits_requis'];
    return {
      moyenne_s1: s1['moyenne'], moyenne_s2: s2['moyenne'], moyenne_generale: m,
      credits_s1: s1['credits_obtenus'], credits_s2: s2['credits_obtenus'], credits_total: credits, credits_requis: requis,
      appreciation: appreciation(m), decision: decisionAnnuelle(m, credits, requis, niveau),
    };
  }

  private bulletin(inscription: Obj, semestre: number | null): any {
    const c = this.classeComplete(inscription['classe_id'])!;
    const [p, s] = c['semestres'];
    const ues = this.uesDeLaClasse(c['id']);
    const notes = this.notesDe(inscription['id']);
    const s1 = this.resultatSemestre(p, ues, notes);
    const s2 = this.resultatSemestre(s, ues, notes);
    const annuel: Obj = this.resultatAnnuel(s1, s2, c['niveau']);
    annuel['delibere_le'] = this.resultatsAnnuels.find((r: any) => r['inscription_id'] === inscription['id'])?.['delibere_le'] ?? null;
    const e = this.trouver('etudiants', inscription['etudiant_id'])!;
    const u = this.user(e['user_id'])!;
    const date = e['date_naissance'] ? e['date_naissance'].split('-').reverse().join('/') : null;
    return {
      entete: {
        annee_academique: c['annee_academique'], classe: c['libelle'], domaine: c['specialite']?.mention?.domaine?.libelle,
        mention: c['specialite']?.mention?.libelle, specialite: c['specialite']?.libelle, grade: c['grade'], semestres: c['semestres'],
      },
      etudiant: {
        id: e['id'], identifiant: e['matricule'], nom_complet: `${u['prenom']} ${String(u['nom']).toUpperCase()}`,
        sexe: e['sexe'] === 'F' ? 'Féminin' : 'Masculin', date_naissance: date, lieu_naissance: e['lieu_naissance'],
      },
      semestre,
      semestres: semestre === null ? [s1, s2] : semestre === p ? [s1] : [s2],
      semestre_precedent: semestre === s ? s1 : null,
      annuel: semestre === null || semestre === s ? annuel : null,
    };
  }

  private classement(classeId: number, semestre: number | null): any {
    const c = this.classe(classeId)!;
    const [p, s] = c['semestres'];
    const ues = this.uesDeLaClasse(classeId);
    const r: Obj[] = this.table('inscriptions').filter((i: any) => i['classe_id'] === classeId).map((i: any) => {
      const e = this.trouver('etudiants', i['etudiant_id'])!;
      const notes = this.notesDe(i['id']);
      const base = { inscription_id: i['id'], etudiant_id: e['id'], identifiant: e['matricule'], nom_complet: this.user(e['user_id'])!['nom_complet'] };
      if (semestre) {
        const x = this.resultatSemestre(semestre, ues, notes);
        return { ...base, moyenne: x.moyenne, credits: x.credits_obtenus, credits_requis: x.credits_requis,
          ues_non_validees: x.ues.filter((u: any) => u['statut'] === 'non_validee').length, decision: x.decision, appreciation: x.appreciation };
      }
      const a = this.resultatAnnuel(this.resultatSemestre(p, ues, notes), this.resultatSemestre(s, ues, notes), c['niveau']);
      return { ...base, moyenne_s1: a.moyenne_s1, moyenne_s2: a.moyenne_s2, moyenne: a.moyenne_generale,
        credits_s1: a.credits_s1, credits_s2: a.credits_s2, credits: a.credits_total, credits_requis: a.credits_requis,
        decision: a.decision, appreciation: a.appreciation,
        delibere: this.resultatsAnnuels.some((x: any) => x['inscription_id'] === i['id']) };
    }).sort((a: any, b: any) => (b['moyenne'] ?? -1) - (a['moyenne'] ?? -1));
    let rang = 0, prec: number | null = null;
    r.forEach((x: any, i: any) => {
      if (x['moyenne'] === null) { x['rang'] = null; return; }
      if (x['moyenne'] !== prec) { rang = i + 1; prec = x['moyenne']; }
      x['rang'] = rang;
    });
    return r;
  }

  // =====================================================================
  // Validation
  // =====================================================================
  private erreur(champ: string, message: string): Reponse {
    return { status: 422, body: { message, errors: { [champ]: [message] } } };
  }
  private requis(d: Obj, champs: string[]): Reponse | null {
    for (const c of champs) {
      if (d[c] === undefined || d[c] === null || String(d[c]).trim() === '') {
        return this.erreur(c, `Le champ ${c.replace('_id', '').replace('_', ' ')} est obligatoire.`);
      }
    }
    return null;
  }

  /** CRUD générique pour les tables simples */
  private crud(nom: string, methode: string, id: number, champs: Obj, apres: (x: Obj) => any): Reponse {
    if (methode === 'POST') return { status: 201, body: apres(this.inserer(nom, champs)) };
    const x = this.trouver(nom, id);
    if (!x) return { status: 404, body: { message: 'Élément introuvable.' } };
    Object.assign(x, champs);
    return { status: 200, body: apres(x) };
  }

  // =====================================================================
  // Routeur : même découpage que routes/api.php
  // =====================================================================
  traiter(methode: string, chemin: string, q: Obj, d: Obj, token: string | null): Reponse {
    const ok = (body: any, status = 200): Reponse => ({ status, body });
    const sem = q['semestre'] ? Number(q['semestre']) : null;
    const morceaux = chemin.split('/').filter(Boolean);
    const id = Number(morceaux[1] ?? 0);
    let m: RegExpMatchArray | null;

    if (chemin === '/login' && methode === 'POST') {
      const u = this.table('users').find((x: any) => x['email'] === String(d['email'] ?? '').trim() && x['password'] === d['password']);
      if (!u) return ok({ message: 'Email ou mot de passe incorrect.' }, 401);
      return ok({ token: 'demo-' + u['id'], user: this.profil(u) });
    }
    const moi = this.table('users').find((u: any) => 'demo-' + u['id'] === token);
    if (!moi) return ok({ message: 'Non authentifié. Veuillez vous connecter.' }, 401);
    const refuse = () => ok({ message: "Accès refusé : vous n'avez pas les droits nécessaires." }, 403);

    // ---------- Commun ----------
    if (chemin === '/me') return ok(this.profil(moi));
    if (chemin === '/logout') return ok({ message: 'Déconnexion réussie.' });
    if (chemin === '/mot-de-passe') {
      if (d['ancien_mot_de_passe'] !== moi['password']) return ok({ message: "L'ancien mot de passe est incorrect." }, 422);
      if (String(d['nouveau_mot_de_passe'] ?? '').length < 6) return this.erreur('nouveau_mot_de_passe', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      moi['password'] = d['nouveau_mot_de_passe'];
      return ok({ message: 'Mot de passe modifié avec succès.' });
    }

    // ---------- Enseignant ----------
    if (morceaux[0] === 'enseignant') {
      if (moi['role'] !== 'enseignant') return refuse();
      const ens = this.table('enseignants').find((x: any) => x['user_id'] === moi['id'])!;
      const ecComplet = (ec: Obj): any => {
        const ue = this.trouver('ues', ec['ue_id'])!;
        return { ...ec, ue: { ...ue, classe: this.classe(ue['classe_id']) } };
      };
      if (chemin === '/enseignant/ecs') {
        return ok(this.table('ecs').filter((e: any) => e['enseignant_id'] === ens['id']).map((ec) => {
          const c = ecComplet(ec);
          const inscrits = this.table('inscriptions').filter((i: any) => i['classe_id'] === c.ue['classe_id']).length;
          const completes = this.table('notes').filter((n: any) => n['ec_id'] === ec['id'] && n['mcc'] !== null && n['examen'] !== null).length;
          return { ...c, effectif: inscrits, progression: inscrits ? Math.round((completes / inscrits) * 100) : 0 };
        }).sort((a: any, b: any) => a.ue['classe_id'] - b.ue['classe_id'] || a.ue['semestre'] - b.ue['semestre'] || a.ue['code'].localeCompare(b.ue['code'])));
      }
      if ((m = chemin.match(/^\/enseignant\/ecs\/(\d+)\/notes$/))) {
        const ec = this.trouver('ecs', +m[1]);
        if (!ec) return ok({ message: 'EC introuvable.' }, 404);
        if (ec['enseignant_id'] !== ens['id']) return ok({ message: 'Cet élément constitutif ne vous est pas attribué.' }, 403);
        const c = ecComplet(ec);
        const inscriptions = this.table('inscriptions').filter((i: any) => i['classe_id'] === c.ue['classe_id']);
        if (methode === 'POST') {
          for (const l of d['notes'] ?? []) {
            for (const k of ['mcc', 'examen', 'rattrapage']) {
              const v = l[k];
              if (v !== null && v !== undefined && v !== '' && (isNaN(+v) || +v < 0 || +v > 20)) return this.erreur('notes', 'Une note doit être comprise entre 0 et 20.');
            }
          }
          for (const l of d['notes'] ?? []) {
            if (!inscriptions.some((i: any) => i['id'] === l['inscription_id'])) continue;
            const val = (v: any) => (v === null || v === undefined || v === '' ? null : +v);
            const valeurs = { mcc: val(l['mcc']), examen: val(l['examen']), rattrapage: val(l['rattrapage']) };
            const idx = this.table('notes').findIndex((n: any) => n['inscription_id'] === l['inscription_id'] && n['ec_id'] === ec['id']);
            const vide = Object.values(valeurs).every((v: any) => v === null);
            if (vide) { if (idx >= 0) this.table('notes').splice(idx, 1); }
            else if (idx >= 0) Object.assign(this.table('notes')[idx], valeurs);
            else this.inserer('notes', { inscription_id: l['inscription_id'], ec_id: ec['id'], ...valeurs });
          }
          return ok({ message: 'Notes enregistrées avec succès.' });
        }
        return ok({
          ec: c,
          etudiants: inscriptions.map((i: any) => {
            const e = this.trouver('etudiants', i['etudiant_id'])!;
            const u = this.user(e['user_id'])!;
            const n = this.notesDe(i['id']).get(ec['id']);
            const mcc = n?.['mcc'] ?? null, ex = n?.['examen'] ?? null, r = n?.['rattrapage'] ?? null;
            return { inscription_id: i['id'], identifiant: e['matricule'], nom_complet: u['nom_complet'], nom: u['nom'],
              mcc, examen: ex, rattrapage: r, moyenne: moyenneEc(mcc, ex, r) };
          }).sort((a: any, b: any) => (a.nom + a.nom_complet).localeCompare(b.nom + b.nom_complet)),
        });
      }
    }

    // ---------- Étudiant ----------
    if (morceaux[0] === 'etudiant') {
      if (moi['role'] !== 'etudiant') return refuse();
      const e = this.table('etudiants').find((x: any) => x['user_id'] === moi['id'])!;
      const i = this.inscription(e['id']);
      if (!i) return ok({ message: 'Aucune inscription trouvée.' }, 404);
      if (chemin === '/etudiant/bulletin') return ok(this.bulletin(i, sem));
      if (chemin === '/etudiant/resume') {
        const b = this.bulletin(i, null);
        const r = (s: Obj): any => ({
          semestre: s['semestre'], moyenne: s['moyenne'], credits_obtenus: s['credits_obtenus'], credits_requis: s['credits_requis'],
          decision: s['decision'], ues_validees: s['ues'].filter((u: Obj) => u['statut'].startsWith('validee')).length, ues_total: s['ues'].length,
        });
        return ok({ entete: b.entete, semestre_1: r(b.semestres[0]), semestre_2: r(b.semestres[1]), annuel: b.annuel });
      }
    }

    // ---------- Administrateur ----------
    if (moi['role'] !== 'admin') return refuse();

    if (chemin === '/dashboard') {
      const parClasse: Obj[] = [], meilleurs: Obj[] = [];
      const appr: Obj = { 'Très bien': 0, 'Bien': 0, 'Assez bien': 0, 'Passable': 0, 'Insuffisant': 0, 'Médiocre': 0 };
      let admis = 0, evalues = 0;
      for (const c of [...this.table('classes')].sort((a: any, b: any) => a['niveau'] - b['niveau'])) {
        const r = this.classement(c['id'], null);
        const t = r.filter((x: any) => x['moyenne'] !== null);
        const a = t.filter((x: any) => x['decision'].startsWith('Admis')).length;
        parClasse.push({ classe: c['libelle'], effectif: r.length,
          moyenne: t.length ? tronquer(t.reduce((s: any, x: any) => s + x['moyenne'], 0) / t.length) : null,
          taux_reussite: t.length ? Math.round((a / t.length) * 100) : null });
        t.forEach((x: any) => { appr[x['appreciation']]++; meilleurs.push({ ...x, classe: c['libelle'] }); });
        admis += a; evalues += t.length;
      }
      meilleurs.sort((a: any, b: any) => b['moyenne'] - a['moyenne']);
      return ok({
        totaux: { etudiants: this.table('etudiants').length, enseignants: this.table('enseignants').length, classes: this.table('classes').length,
          ues: this.table('ues').length, ecs: this.table('ecs').length, notes: this.table('notes').length },
        taux_reussite: evalues ? Math.round((admis / evalues) * 100) : null, par_classe: parClasse, appreciations: appr, meilleurs: meilleurs.slice(0, 5),
      });
    }

    // Offre de formation
    if (morceaux[0] === 'domaines') {
      if (methode === 'GET') {
        return ok(this.table('domaines').map((dom) => ({ ...dom,
          mentions: this.table('mentions').filter((x: any) => x['domaine_id'] === dom['id']).map((men) => ({ ...men,
            specialites: this.table('specialites').filter((s: any) => s['mention_id'] === men['id']) })) })));
      }
      if (methode === 'DELETE') {
        if (this.table('mentions').some((x: any) => x['domaine_id'] === id)) return ok({ message: "Supprimez d'abord les mentions de ce domaine." }, 422);
        this.t['domaines'] = this.table('domaines').filter((x: any) => x['id'] !== id);
        return ok({ message: 'Domaine supprimé.' });
      }
      const err = this.requis(d, ['libelle']); if (err) return err;
      return this.crud('domaines', methode, id, { libelle: d['libelle'] }, (x: any) => x);
    }
    if (morceaux[0] === 'mentions') {
      if (methode === 'DELETE') {
        if (this.table('specialites').some((x: any) => x['mention_id'] === id)) return ok({ message: "Supprimez d'abord les spécialités de cette mention." }, 422);
        this.t['mentions'] = this.table('mentions').filter((x: any) => x['id'] !== id);
        return ok({ message: 'Mention supprimée.' });
      }
      const err = this.requis(d, ['domaine_id', 'libelle']); if (err) return err;
      return this.crud('mentions', methode, id, { domaine_id: +d['domaine_id'], libelle: d['libelle'] }, (x: any) => x);
    }
    if (morceaux[0] === 'specialites') {
      if (methode === 'GET') {
        return ok(this.table('specialites').map((s: any) => {
          const men = this.trouver('mentions', s['mention_id'])!;
          return { ...s, mention: { ...men, domaine: this.trouver('domaines', men['domaine_id']) },
            classes_count: this.table('classes').filter((c: any) => c['specialite_id'] === s['id']).length };
        }));
      }
      if (methode === 'DELETE') {
        if (this.table('classes').some((c: any) => c['specialite_id'] === id)) return ok({ message: 'Impossible de supprimer une spécialité qui a des classes.' }, 422);
        this.t['specialites'] = this.table('specialites').filter((x: any) => x['id'] !== id);
        return ok({ message: 'Spécialité supprimée.' });
      }
      const err = this.requis(d, ['mention_id', 'code', 'libelle']); if (err) return err;
      if (this.table('specialites').some((s: any) => s['code'] === d['code'] && s['id'] !== id)) return this.erreur('code', 'Ce code de spécialité existe déjà.');
      return this.crud('specialites', methode, id, { mention_id: +d['mention_id'], code: d['code'], libelle: d['libelle'] }, (x: any) => x);
    }

    // Classes
    if ((m = chemin.match(/^\/classes\/(\d+)\/resultats$/))) {
      return ok({ classe: this.classeComplete(+m[1]), semestre: sem, resultats: this.classement(+m[1], sem) });
    }
    if ((m = chemin.match(/^\/classes\/(\d+)\/deliberation$/))) {
      const r = this.classement(+m[1], null);
      const attente = r.filter((x: any) => x['moyenne'] === null).length;
      if (attente) return ok({ message: `Délibération impossible : ${attente} étudiant(s) ont encore des examens à faire.` }, 422);
      const date = new Date().toISOString().slice(0, 10);
      for (const x of r) {
        this.resultatsAnnuels = this.resultatsAnnuels.filter((y: any) => y['inscription_id'] !== x['inscription_id']);
        this.resultatsAnnuels.push({ ...x, delibere_le: date });
      }
      return ok({ message: `Délibération enregistrée pour ${r.length} étudiant(s).` });
    }
    if (morceaux[0] === 'classes') {
      if (methode === 'GET') {
        return ok([...this.table('classes')].sort((a: any, b: any) => a['niveau'] - b['niveau']).map((c: any) => ({
          ...this.classeComplete(c['id']),
          inscriptions_count: this.table('inscriptions').filter((i: any) => i['classe_id'] === c['id']).length,
          ues_count: this.table('ues').filter((u: any) => u['classe_id'] === c['id']).length,
        })));
      }
      if (methode === 'DELETE') {
        if (this.table('inscriptions').some((i: any) => i['classe_id'] === id)) return ok({ message: 'Impossible de supprimer une classe qui contient des étudiants.' }, 422);
        this.t['classes'] = this.table('classes').filter((x: any) => x['id'] !== id);
        return ok({ message: 'Classe supprimée.' });
      }
      const err = this.requis(d, ['specialite_id', 'libelle', 'grade', 'niveau', 'annee_academique']); if (err) return err;
      if (!/^\d{4}-\d{4}$/.test(d['annee_academique'])) return this.erreur('annee_academique', "L'année académique doit avoir le format 2025-2026.");
      return this.crud('classes', methode, id, { specialite_id: +d['specialite_id'], libelle: d['libelle'], grade: d['grade'],
        niveau: +d['niveau'], annee_academique: d['annee_academique'] }, (x: any) => this.classeComplete(x['id']));
    }

    // UE et EC
    if (morceaux[0] === 'ues') {
      if (methode === 'GET') {
        return ok(this.table('ues')
          .filter((u: any) => (!q['classe_id'] || u['classe_id'] === +q['classe_id']) && (!q['semestre'] || u['semestre'] === +q['semestre']))
          .sort((a: any, b: any) => a['classe_id'] - b['classe_id'] || a['semestre'] - b['semestre'] || a['code'].localeCompare(b['code']))
          .map((u: any) => ({ ...u, classe: this.classe(u['classe_id']),
            ecs: this.table('ecs').filter((e: any) => e['ue_id'] === u['id']).map((e: any) => ({ ...e, enseignant: this.enseignant(e['enseignant_id']) })) })));
      }
      if (methode === 'DELETE') {
        const ecs = this.table('ecs').filter((e: any) => e['ue_id'] === id).map((e: any) => e['id']);
        this.t['notes'] = this.table('notes').filter((n: any) => !ecs.includes(n['ec_id']));
        this.t['ecs'] = this.table('ecs').filter((e: any) => e['ue_id'] !== id);
        this.t['ues'] = this.table('ues').filter((u: any) => u['id'] !== id);
        return ok({ message: 'UE supprimée.' });
      }
      const err = this.requis(d, ['classe_id', 'code', 'libelle', 'credits', 'semestre']); if (err) return err;
      if (this.table('ues').some((u: any) => u['id'] !== id && u['code'] === d['code'] && u['classe_id'] === +d['classe_id'])) return this.erreur('code', "Ce code d'UE existe déjà dans cette classe.");
      const c = this.classe(+d['classe_id'])!;
      if (!c['semestres'].includes(+d['semestre'])) return this.erreur('semestre', `Le semestre doit être S${c['semestres'][0]} ou S${c['semestres'][1]} pour cette classe.`);
      return this.crud('ues', methode, id, { classe_id: +d['classe_id'], code: d['code'], libelle: d['libelle'], credits: +d['credits'], semestre: +d['semestre'] }, (x: any) => x);
    }
    if (morceaux[0] === 'ecs') {
      if (methode === 'DELETE') {
        this.t['notes'] = this.table('notes').filter((n: any) => n['ec_id'] !== id);
        this.t['ecs'] = this.table('ecs').filter((e: any) => e['id'] !== id);
        return ok({ message: 'EC supprimé.' });
      }
      const err = this.requis(d, ['ue_id', 'libelle', 'coefficient']); if (err) return err;
      return this.crud('ecs', methode, id, { ue_id: +d['ue_id'], libelle: d['libelle'], coefficient: +d['coefficient'],
        enseignant_id: d['enseignant_id'] ? +d['enseignant_id'] : null }, (x: any) => ({ ...x, enseignant: this.enseignant(x['enseignant_id']) }));
    }

    // Étudiants
    if ((m = chemin.match(/^\/etudiants\/(\d+)\/bulletin$/))) {
      const i = this.inscription(+m[1]);
      return i ? ok(this.bulletin(i, sem)) : ok({ message: "Cet étudiant n'est inscrit dans aucune classe." }, 404);
    }
    if (morceaux[0] === 'etudiants') {
      if (methode === 'GET') {
        const terme = String(q['recherche'] ?? '').toLowerCase();
        return ok(this.table('etudiants').map((e: any) => this.etudiantComplet(e))
          .filter((e: any) => !q['classe_id'] || e.inscription?.['classe_id'] === +q['classe_id'])
          .filter((e: any) => !terme || [e['matricule'], e.user?.['nom'], e.user?.['prenom'], e.user?.['email']].some((v: any) => String(v).toLowerCase().includes(terme)))
          .sort((a: any, b: any) => a['matricule'].localeCompare(b['matricule'])));
      }
      const existant = this.trouver('etudiants', id);
      if (methode === 'DELETE') {
        const ins = this.table('inscriptions').filter((i: any) => i['etudiant_id'] === id).map((i: any) => i['id']);
        this.t['notes'] = this.table('notes').filter((n: any) => !ins.includes(n['inscription_id']));
        this.t['inscriptions'] = this.table('inscriptions').filter((i: any) => i['etudiant_id'] !== id);
        this.t['etudiants'] = this.table('etudiants').filter((e: any) => e['id'] !== id);
        this.t['users'] = this.table('users').filter((u: any) => u['id'] !== existant?.['user_id']);
        return ok({ message: 'Étudiant supprimé.' });
      }
      const err = this.requis(d, ['prenom', 'nom', 'email', 'matricule', 'sexe', 'classe_id']); if (err) return err;
      if (this.table('users').some((u: any) => u['email'] === d['email'] && u['id'] !== existant?.['user_id'])) return this.erreur('email', 'Cet email est déjà utilisé.');
      if (this.table('etudiants').some((e: any) => e['matricule'] === d['matricule'] && e['id'] !== id)) return this.erreur('matricule', 'Cet identifiant est déjà attribué.');
      const champsUser = { prenom: d['prenom'], nom: d['nom'], email: d['email'], telephone: d['telephone'] || null };
      const champsEtu = { matricule: d['matricule'], sexe: d['sexe'], date_naissance: d['date_naissance'] || null, lieu_naissance: d['lieu_naissance'] || null };
      if (methode === 'POST') {
        const u = this.inserer('users', { ...champsUser, role: 'etudiant', password: d['password'] || 'passer123' });
        const e = this.inserer('etudiants', { user_id: u['id'], ...champsEtu });
        this.inserer('inscriptions', { etudiant_id: e['id'], classe_id: +d['classe_id'] });
        return ok(this.etudiantComplet(e), 201);
      }
      Object.assign(this.trouver('users', existant!['user_id'])!, champsUser, d['password'] ? { password: d['password'] } : {});
      Object.assign(existant!, champsEtu);
      const i = this.inscription(id);
      if (i) i['classe_id'] = +d['classe_id']; else this.inserer('inscriptions', { etudiant_id: id, classe_id: +d['classe_id'] });
      return ok(this.etudiantComplet(existant!));
    }

    // Enseignants
    if (morceaux[0] === 'enseignants') {
      const liste = (e: Obj): any => ({ ...e, user: this.user(e['user_id']),
        ecs: this.table('ecs').filter((x: any) => x['enseignant_id'] === e['id']).map((x: any) => {
          const ue = this.trouver('ues', x['ue_id'])!;
          return { ...x, ue: { ...ue, classe: this.classe(ue['classe_id']) } };
        }) });
      if (methode === 'GET') return ok([...this.table('enseignants')].sort((a: any, b: any) => a['matricule'].localeCompare(b['matricule'])).map(liste));
      const existant = this.trouver('enseignants', id);
      if (methode === 'DELETE') {
        this.table('ecs').forEach((x: any) => { if (x['enseignant_id'] === id) x['enseignant_id'] = null; });
        this.t['enseignants'] = this.table('enseignants').filter((e: any) => e['id'] !== id);
        this.t['users'] = this.table('users').filter((u: any) => u['id'] !== existant?.['user_id']);
        return ok({ message: 'Enseignant supprimé.' });
      }
      const err = this.requis(d, ['prenom', 'nom', 'email', 'matricule']); if (err) return err;
      if (this.table('users').some((u: any) => u['email'] === d['email'] && u['id'] !== existant?.['user_id'])) return this.erreur('email', 'Cet email est déjà utilisé.');
      if (this.table('enseignants').some((e: any) => e['matricule'] === d['matricule'] && e['id'] !== id)) return this.erreur('matricule', 'Ce matricule est déjà attribué.');
      const champsUser = { prenom: d['prenom'], nom: d['nom'], email: d['email'], telephone: d['telephone'] || null };
      if (methode === 'POST') {
        const u = this.inserer('users', { ...champsUser, role: 'enseignant', password: d['password'] || 'passer123' });
        return ok(liste(this.inserer('enseignants', { user_id: u['id'], matricule: d['matricule'], specialite: d['specialite'] || null })), 201);
      }
      Object.assign(this.trouver('users', existant!['user_id'])!, champsUser, d['password'] ? { password: d['password'] } : {});
      Object.assign(existant!, { matricule: d['matricule'], specialite: d['specialite'] || null });
      return ok(liste(existant!));
    }

    return ok({ message: 'Route introuvable.' }, 404);
  }

  private profil(u: Obj): any {
    const e = this.table('etudiants').find((x: any) => x['user_id'] === u['id']);
    const i = e ? this.inscription(e['id']) : null;
    return {
      ...this.user(u['id']),
      etudiant: e ? { ...e, inscription: i ? { ...i, classe: this.classeComplete(i['classe_id']) } : null } : null,
      enseignant: this.table('enseignants').find((x: any) => x['user_id'] === u['id']) ?? null,
    };
  }
}
