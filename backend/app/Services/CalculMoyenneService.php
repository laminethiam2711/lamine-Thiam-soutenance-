<?php

namespace App\Services;

use App\Models\Classe;
use App\Models\Inscription;
use App\Models\Note;
use App\Models\Ue;
use Illuminate\Support\Collection;

/**
 * Calcul des résultats selon les règles du bulletin de l'ISI (système LMD).
 *
 *  Moyenne d'un EC     = MCC × 40 % + Examen × 60 %            (arrondie à 2 décimales)
 *                        Si une note de rattrapage existe, elle remplace l'examen quand elle est meilleure.
 *  Moyenne Coef (EC)   = Moyenne EC × Coefficient EC
 *  Moyenne d'une UE    = Σ Moyenne Coef / Σ Coefficients de l'UE  (arrondie à 3 décimales)
 *  UE validée          = Moyenne UE ≥ 10 → l'UE donne tous ses crédits (compensation entre EC de l'UE)
 *  Moyenne du semestre = Σ (Moyenne UE × Σ coef UE) / Σ coefficients   (tronquée à 2 décimales)
 *  Moyenne générale    = (Moyenne S1 + Moyenne S2) / 2              (tronquée à 2 décimales)
 *  Crédits             = 30 par semestre, 60 par an
 *  Passage             = 60 crédits → « Admis(e) en classe supérieure »
 *
 * Vérification avec un bulletin réel (L2, S3) :
 *   UE : 58,00/5 = 11,600 · 56,00/4 = 14,000 · 80,80/8 = 10,100 · 74,00/6 = 12,333 · 44,80/4 = 11,200 · 59,20/5 = 11,840
 *   Semestre : (11,600×5 + 14,000×4 + 10,100×8 + 12,333×6 + 11,200×4 + 11,840×5) / 32 = 372,798 / 32 = 11,6499 → 11,64
 */
class CalculMoyenneService
{
    public const POIDS_MCC = 0.4;
    public const POIDS_EXAMEN = 0.6;
    public const MOYENNE_VALIDATION = 10;

    public const UE_VALIDEE = 'validee';
    public const UE_VALIDEE_RATTRAPAGE = 'validee_rattrapage';
    public const UE_NON_VALIDEE = 'non_validee';
    public const UE_EN_ATTENTE = 'en_attente';

    // ---------------------------------------------------------------
    //  Règles de base
    // ---------------------------------------------------------------

    /** Troncature : 11,6499 → 11,64 (le petit epsilon corrige les erreurs d'arrondi des flottants) */
    public static function tronquer(float $valeur, int $decimales = 2): float
    {
        $facteur = 10 ** $decimales;

        return floor($valeur * $facteur + 1e-7) / $facteur;
    }

    /**
     * Moyenne d'un EC. Renvoie null tant que l'examen n'est pas passé (« Examen à faire »).
     */
    public static function moyenneEc(?float $mcc, ?float $examen, ?float $rattrapage = null): ?float
    {
        $examenRetenu = $examen;
        if ($rattrapage !== null && ($examen === null || $rattrapage > $examen)) {
            $examenRetenu = $rattrapage;
        }

        if ($examenRetenu === null) {
            return null;
        }
        if ($mcc === null) {
            return round($examenRetenu, 2);
        }

        return round($mcc * self::POIDS_MCC + $examenRetenu * self::POIDS_EXAMEN, 2);
    }

    /** Appréciation d'une moyenne (barème du bulletin) */
    public static function appreciation(?float $moyenne): string
    {
        return match (true) {
            $moyenne === null => '',
            $moyenne >= 16 => 'Très bien',
            $moyenne >= 14 => 'Bien',
            $moyenne >= 12 => 'Assez bien',
            $moyenne >= 10 => 'Passable',
            $moyenne >= 8 => 'Insuffisant',
            default => 'Médiocre',
        };
    }

    /** Décision du jury pour un semestre, ex. « Travail Passable » */
    public static function decisionSemestre(?float $moyenne): string
    {
        return $moyenne === null ? 'En attente' : 'Travail '.self::appreciation($moyenne);
    }

    /** Résultat de fin d'année */
    public static function decisionAnnuelle(?float $moyenne, int $credits, int $creditsRequis, int $niveau): string
    {
        if ($moyenne === null) {
            return 'En attente';
        }
        if ($credits >= $creditsRequis) {
            return $niveau >= 3 ? 'Admis(e) — Licence validée' : 'Admis(e) en classe supérieure';
        }

        return 'Ajourné(e)';
    }

    // ---------------------------------------------------------------
    //  Calcul d'un semestre
    // ---------------------------------------------------------------

    /**
     * Résultat d'un semestre à partir des UE (avec leurs EC chargés) et des notes de l'inscription.
     *
     * @param  Collection<int, Ue>  $ues
     * @param  Collection<int, Note>  $notes  indexées par ec_id
     */
    public static function resultatSemestre(int $semestre, Collection $ues, Collection $notes): array
    {
        $lignesUe = [];
        $sommePondereeUe = 0;
        $totalCoef = 0;
        $totalPoints = 0;
        $credits = 0;
        $creditsRequis = 0;
        $complet = true;

        foreach ($ues->where('semestre', $semestre)->sortBy('code') as $ue) {
            $ecs = [];
            $pointsUe = 0;
            $coefUe = 0;
            $examenAFaire = false;
            $rattrapageUtilise = false;

            foreach ($ue->ecs as $ec) {
                $note = $notes->get($ec->id);
                $mcc = $note?->mcc;
                $examen = $note?->examen;
                $rattrapage = $note?->rattrapage;
                $moyenne = self::moyenneEc($mcc, $examen, $rattrapage);
                $points = $moyenne !== null ? round($moyenne * $ec->coefficient, 2) : null;

                if ($moyenne === null) {
                    $examenAFaire = true;
                } else {
                    $pointsUe += $points;
                }
                $coefUe += $ec->coefficient;
                if ($rattrapage !== null) {
                    $rattrapageUtilise = true;
                }

                $ecs[] = [
                    'ec_id' => $ec->id,
                    'libelle' => $ec->libelle,
                    'coefficient' => $ec->coefficient,
                    'enseignant' => $ec->enseignant?->user?->nom_complet,
                    'mcc' => $mcc,
                    'examen' => $examen,
                    'rattrapage' => $rattrapage,
                    'moyenne' => $moyenne,
                    'points' => $points,
                    'appreciation' => self::appreciation($moyenne),
                    'examen_a_faire' => $moyenne === null,
                ];
            }

            $moyenneUe = (! $examenAFaire && $coefUe > 0) ? round($pointsUe / $coefUe, 3) : null;

            $statut = match (true) {
                $moyenneUe === null => self::UE_EN_ATTENTE,
                $moyenneUe < self::MOYENNE_VALIDATION => self::UE_NON_VALIDEE,
                $rattrapageUtilise => self::UE_VALIDEE_RATTRAPAGE,
                default => self::UE_VALIDEE,
            };
            $creditsObtenus = in_array($statut, [self::UE_VALIDEE, self::UE_VALIDEE_RATTRAPAGE]) ? $ue->credits : 0;

            $lignesUe[] = [
                'ue_id' => $ue->id,
                'code' => $ue->code,
                'libelle' => $ue->libelle,
                'credits' => $ue->credits,
                'total_coefficients' => $coefUe,
                'total_points' => round($pointsUe, 2),
                'moyenne' => $moyenneUe,
                'statut' => $statut,
                'credits_obtenus' => $creditsObtenus,
                'ecs' => $ecs,
            ];

            if ($moyenneUe === null) {
                $complet = false;
            } else {
                $sommePondereeUe += $moyenneUe * $coefUe;
            }
            $totalCoef += $coefUe;
            $totalPoints += $pointsUe;
            $credits += $creditsObtenus;
            $creditsRequis += $ue->credits;
        }

        $moyenne = ($complet && $totalCoef > 0) ? self::tronquer($sommePondereeUe / $totalCoef) : null;

        return [
            'semestre' => $semestre,
            'ues' => $lignesUe,
            'recapitulatif' => self::recapitulatif($lignesUe),
            'total_coefficients' => $totalCoef,
            'total_points' => round($totalPoints, 2),
            'moyenne' => $moyenne,
            'appreciation' => self::appreciation($moyenne),
            'credits_obtenus' => $credits,
            'credits_requis' => $creditsRequis,
            'decision' => self::decisionSemestre($moyenne),
        ];
    }

    /**
     * « Récapitulatif des unités » : UE 1, UE 2… numérotées selon le numéro de leur code
     * (ALA1301 = UE 1, RSY1302 = UE 2…). Moyennes tronquées à 2 décimales, comme sur le bulletin.
     */
    public static function recapitulatif(array $lignesUe): array
    {
        usort($lignesUe, fn ($a, $b) => self::numeroUe($a['code']) <=> self::numeroUe($b['code']));

        return array_map(fn ($l) => [
            'code' => $l['code'],
            'moyenne' => $l['moyenne'] !== null ? self::tronquer($l['moyenne']) : null,
            'statut' => $l['statut'],
            'credits_obtenus' => $l['credits_obtenus'],
        ], $lignesUe);
    }

    private static function numeroUe(string $code): int
    {
        return preg_match('/(\d+)\s*$/', $code, $m) ? (int) $m[1] : PHP_INT_MAX;
    }

    // ---------------------------------------------------------------
    //  Année, bulletin et classement
    // ---------------------------------------------------------------

    /** Résultat annuel calculé à partir des deux semestres */
    public static function resultatAnnuel(array $s1, array $s2, int $niveau): array
    {
        $moyenne = ($s1['moyenne'] !== null && $s2['moyenne'] !== null)
            ? self::tronquer(($s1['moyenne'] + $s2['moyenne']) / 2)
            : null;
        $credits = $s1['credits_obtenus'] + $s2['credits_obtenus'];
        $requis = $s1['credits_requis'] + $s2['credits_requis'];

        return [
            'moyenne_s1' => $s1['moyenne'],
            'moyenne_s2' => $s2['moyenne'],
            'moyenne_generale' => $moyenne,
            'credits_s1' => $s1['credits_obtenus'],
            'credits_s2' => $s2['credits_obtenus'],
            'credits_total' => $credits,
            'credits_requis' => $requis,
            'appreciation' => self::appreciation($moyenne),
            'decision' => self::decisionAnnuelle($moyenne, $credits, $requis, $niveau),
        ];
    }

    /**
     * Bulletin d'une inscription.
     *  - $semestre = numéro LMD (ex. 3) : bulletin du semestre.
     *    Pour le 2e semestre de l'année, le bulletin reprend aussi le 1er et le résultat annuel.
     *  - $semestre = null : relevé annuel (les deux semestres).
     */
    public function bulletin(Inscription $inscription, ?int $semestre = null): array
    {
        $inscription->loadMissing('etudiant.user', 'classe.specialite.mention.domaine', 'resultatAnnuel');
        $classe = $inscription->classe;
        [$premier, $second] = $classe->semestres;

        $ues = $this->uesDeLaClasse($classe);
        $notes = Note::where('inscription_id', $inscription->id)->get()->keyBy('ec_id');

        $s1 = self::resultatSemestre($premier, $ues, $notes);
        $s2 = self::resultatSemestre($second, $ues, $notes);
        $annuel = self::resultatAnnuel($s1, $s2, $classe->niveau);
        $annuel['delibere_le'] = $inscription->resultatAnnuel?->delibere_le?->format('Y-m-d');

        $etudiant = $inscription->etudiant;
        $specialite = $classe->specialite;

        return [
            'entete' => [
                'annee_academique' => $classe->annee_academique,
                'classe' => $classe->libelle,
                'domaine' => $specialite?->mention?->domaine?->libelle,
                'mention' => $specialite?->mention?->libelle,
                'specialite' => $specialite?->libelle,
                'grade' => $classe->grade,
                'semestres' => $classe->semestres,
            ],
            'etudiant' => [
                'id' => $etudiant->id,
                'identifiant' => $etudiant->matricule,
                'nom_complet' => $etudiant->user->prenom.' '.mb_strtoupper($etudiant->user->nom),
                'sexe' => $etudiant->sexe === 'F' ? 'Féminin' : 'Masculin',
                'date_naissance' => $etudiant->date_naissance?->format('d/m/Y'),
                'lieu_naissance' => $etudiant->lieu_naissance,
            ],
            'semestre' => $semestre,
            // Semestres affichés : le semestre demandé, ou les deux pour le relevé annuel
            'semestres' => match ($semestre) {
                null => [$s1, $s2],
                $premier => [$s1],
                default => [$s2],
            },
            // Rappel du 1er semestre et résultat annuel sur le bulletin du 2e semestre
            'semestre_precedent' => $semestre === $second ? $s1 : null,
            'annuel' => ($semestre === null || $semestre === $second) ? $annuel : null,
        ];
    }

    /**
     * Classement d'une classe pour un semestre (numéro LMD) ou pour l'année (null).
     *
     * @return array<int, array<string, mixed>>
     */
    public function classement(Classe $classe, ?int $semestre = null): array
    {
        [$premier, $second] = $classe->semestres;
        $ues = $this->uesDeLaClasse($classe);
        $inscriptions = $classe->inscriptions()->with(['etudiant.user', 'resultatAnnuel'])->get();

        $notesParInscription = Note::whereIn('inscription_id', $inscriptions->pluck('id'))
            ->get()->groupBy('inscription_id');

        $resultats = $inscriptions->map(function (Inscription $i) use ($ues, $notesParInscription, $premier, $second, $semestre, $classe) {
            $notes = $notesParInscription->get($i->id, collect())->keyBy('ec_id');
            $base = [
                'inscription_id' => $i->id,
                'etudiant_id' => $i->etudiant_id,
                'identifiant' => $i->etudiant->matricule,
                'nom_complet' => $i->etudiant->user->nom_complet,
            ];

            if ($semestre) {
                $r = self::resultatSemestre($semestre, $ues, $notes);

                return $base + [
                    'moyenne' => $r['moyenne'],
                    'credits' => $r['credits_obtenus'],
                    'credits_requis' => $r['credits_requis'],
                    'ues_non_validees' => count(array_filter($r['ues'], fn ($u) => $u['statut'] === self::UE_NON_VALIDEE)),
                    'decision' => $r['decision'],
                    'appreciation' => $r['appreciation'],
                ];
            }

            $s1 = self::resultatSemestre($premier, $ues, $notes);
            $s2 = self::resultatSemestre($second, $ues, $notes);
            $a = self::resultatAnnuel($s1, $s2, $classe->niveau);

            return $base + [
                'moyenne_s1' => $a['moyenne_s1'],
                'moyenne_s2' => $a['moyenne_s2'],
                'moyenne' => $a['moyenne_generale'],
                'credits_s1' => $a['credits_s1'],
                'credits_s2' => $a['credits_s2'],
                'credits' => $a['credits_total'],
                'credits_requis' => $a['credits_requis'],
                'decision' => $a['decision'],
                'appreciation' => $a['appreciation'],
                'delibere' => $i->resultatAnnuel !== null,
            ];
        })->sortByDesc(fn ($r) => $r['moyenne'] ?? -1)->values()->all();

        return self::attribuerRangs($resultats);
    }

    /** Rangs avec ex aequo (1, 2, 2, 4…). Le tableau doit être trié par moyenne décroissante. */
    public static function attribuerRangs(array $resultats): array
    {
        $rang = 0;
        $precedente = null;
        foreach ($resultats as $i => &$r) {
            if ($r['moyenne'] === null) {
                $r['rang'] = null;
                continue;
            }
            if ($r['moyenne'] !== $precedente) {
                $rang = $i + 1;
                $precedente = $r['moyenne'];
            }
            $r['rang'] = $rang;
        }
        unset($r);

        return $resultats;
    }

    private function uesDeLaClasse(Classe $classe): Collection
    {
        return Ue::with('ecs.enseignant.user')->where('classe_id', $classe->id)->orderBy('code')->get();
    }
}
