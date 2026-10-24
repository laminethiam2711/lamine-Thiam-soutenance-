<?php

namespace Tests\Unit;

use App\Models\Ec;
use App\Models\Note;
use App\Models\Ue;
use App\Services\CalculMoyenneService as Calcul;
use PHPUnit\Framework\TestCase;

/**
 * Vérifie les règles de calcul avec un vrai bulletin ISI (L2 IAGE 2024-2025, semestres 3 et 4).
 * Résultats attendus, lus sur les bulletins : S3 = 11,64 · S4 = 11,06 · Moyenne générale = 11,35 · 60/60 crédits.
 *
 * Lancer : php artisan test --filter=CalculMoyenneServiceTest
 */
class CalculMoyenneServiceTest extends TestCase
{
    private array $ues = [];

    private array $notes = [];

    private int $id = 0;

    /** @param array<int, array{0: string, 1: int, 2: float, 3: float}> $ecs [libellé, coef, MCC, examen] */
    private function ue(string $code, int $semestre, int $credits, array $ecs): void
    {
        $ue = new Ue(['code' => $code, 'libelle' => $code, 'semestre' => $semestre, 'credits' => $credits]);
        $ue->id = ++$this->id;
        $liste = [];
        foreach ($ecs as [$libelle, $coef, $mcc, $examen]) {
            $ec = new Ec(['libelle' => $libelle, 'coefficient' => $coef]);
            $ec->id = ++$this->id;
            $ec->setRelation('enseignant', null);
            $liste[] = $ec;
            $this->notes[$ec->id] = new Note(['mcc' => $mcc, 'examen' => $examen, 'rattrapage' => null]);
        }
        $ue->setRelation('ecs', collect($liste));
        $this->ues[] = $ue;
    }

    protected function setUp(): void
    {
        parent::setUp();
        // Semestre 3
        $this->ue('ALA1301', 3, 5, [['Algorithmique 3', 3, 10, 10], ['Programmation Python 1', 2, 11, 16]]);
        $this->ue('RSY1302', 3, 4, [['Administration système Linux', 2, 14, 14], ['Fondamentaux réseaux 1', 2, 12, 6]]);
        $this->ue('SIBD1303', 3, 4, [['Analyse et conception SI 1', 2, 11.75, 8], ['Technologie web 3', 3, 14, 13]]);
        $this->ue('MAP1304', 3, 6, [['Probabilités et statistiques 1', 3, 8, 8], ['Recherche opérationnelle', 2, 14, 12], ['Comptabilité analytique', 3, 11, 10]]);
        $this->ue('MOR1305', 3, 7, [['Fiscalité des entreprises', 2, 13, 8], ['Technique de communication', 2, 14, 13], ['CRM et marketing digital', 2, 13, 14]]);
        $this->ue('COM1306', 3, 4, [['Anglais : TOEIC 3', 2, 14, 13], ['Communication professionnelle', 2, 17, 13]]);
        // Semestre 4
        $this->ue('ALA1401', 4, 9, [['Algorithmique 4', 3, 5, 12], ['POO Java', 3, 12, 12], ['Programmation Python 2', 3, 10, 10]]);
        $this->ue('RSY1402', 4, 6, [['Fondamentaux réseaux 2', 3, 4, 6], ['Administration réseaux Linux', 3, 15, 15]]);
        $this->ue('SGBD1403', 4, 4, [['Analyse et conception SI 2', 3, 8, 8], ['Technologies web', 2, 12, 14]]);
        $this->ue('MAP1404', 4, 6, [['Probabilités statistiques', 2, 4, 10], ['Mathématiques financières', 2, 11, 14], ['Comptabilité analytique', 2, 17, 17]]);
        $this->ue('MOR1405', 4, 5, [['Droit des TIC', 3, 16, 6], ['Anglais', 2, 18, 16]]);
    }

    private function semestre(int $s): array
    {
        return Calcul::resultatSemestre($s, collect($this->ues), collect($this->notes));
    }

    public function test_moyenne_ec_40_60(): void
    {
        $this->assertSame(14.0, Calcul::moyenneEc(11, 16));   // Programmation Python 1
        $this->assertSame(9.2, Calcul::moyenneEc(5, 12));     // Algorithmique 4
    }

    public function test_rattrapage_remplace_examen_s_il_est_meilleur(): void
    {
        $this->assertSame(9.2, Calcul::moyenneEc(5, 6, 12));  // 5×0,4 + 12×0,6
        $this->assertSame(9.2, Calcul::moyenneEc(5, 12, 8));  // le rattrapage moins bon est ignoré
        $this->assertNull(Calcul::moyenneEc(12, null));        // examen à faire
    }

    public function test_semestre_3(): void
    {
        $s3 = $this->semestre(3);
        $moyennes = array_column($s3['ues'], 'moyenne', 'code');

        $this->assertSame(12.333, $moyennes['MOR1305']);      // 74,00 / 6, arrondi à 3 décimales
        $this->assertSame(10.1, $moyennes['MAP1304']);        // validée malgré un EC à 8,00
        $this->assertSame(372.8, $s3['total_points']);
        $this->assertSame(32, $s3['total_coefficients']);
        $this->assertSame(11.64, $s3['moyenne']);             // 11,6499 tronqué
        $this->assertSame(30, $s3['credits_obtenus']);
        $this->assertSame('Travail Passable', $s3['decision']);
        // Récapitulatif dans l'ordre des numéros d'UE
        $this->assertSame(['ALA1301', 'RSY1302', 'SIBD1303', 'MAP1304', 'MOR1305', 'COM1306'],
            array_column($s3['recapitulatif'], 'code'));
    }

    public function test_semestre_4_et_resultat_annuel(): void
    {
        $s3 = $this->semestre(3);
        $s4 = $this->semestre(4);

        $this->assertSame(11.06, $s4['moyenne']);
        $recap = array_column($s4['recapitulatif'], 'moyenne', 'code');
        $this->assertSame(12.46, $recap['MAP1404'], '12,467 est tronqué à 12,46 dans le récapitulatif');

        $annuel = Calcul::resultatAnnuel($s3, $s4, 2);
        $this->assertSame(11.35, $annuel['moyenne_generale']);
        $this->assertSame(60, $annuel['credits_total']);
        $this->assertSame('Admis(e) en classe supérieure', $annuel['decision']);
    }

    public function test_appreciations(): void
    {
        $this->assertSame('Médiocre', Calcul::appreciation(7.6));
        $this->assertSame('Insuffisant', Calcul::appreciation(8.0));
        $this->assertSame('Passable', Calcul::appreciation(10.0));
        $this->assertSame('Assez bien', Calcul::appreciation(12.8));
        $this->assertSame('Bien', Calcul::appreciation(15.0));
        $this->assertSame('Très bien', Calcul::appreciation(16.8));
    }
}
