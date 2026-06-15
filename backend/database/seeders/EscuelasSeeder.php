<?php

namespace Database\Seeders;

use App\Domains\Catalogos\Models\EscuelaBachillerato;
use App\Domains\Catalogos\Models\Estado;
use App\Domains\Catalogos\Models\Municipio;
use Illuminate\Database\Seeder;

class EscuelasSeeder extends Seeder
{
    public function run(): void
    {
        $veracruz = Estado::where('clave_curp', 'VZ')->first();
        if (! $veracruz) {
            $this->command->warn('Estado Veracruz no encontrado. Ejecuta CatalogoSeeder primero.');
            return;
        }

        $municipio = fn(string $nombre) => Municipio::firstOrCreate(
            ['estado_id' => $veracruz->id, 'nombre' => $nombre]
        );

        $escuela = function (string $nombre, string $tipo, Municipio $mun) {
            EscuelaBachillerato::firstOrCreate(
                ['nombre' => $nombre, 'municipio_id' => $mun->id],
                ['tipo' => $tipo, 'activa' => true]
            );
        };

        // ═══════════════════════════════════════════════════════════════════════
        // MARTÍNEZ DE LA TORRE
        // ═══════════════════════════════════════════════════════════════════════
        $mtt = $municipio('Martínez de la Torre');

        // — Públicas federales —
        $escuela('CBTIS No. 76 Martínez de la Torre',               'cbtis',           $mtt);
        $escuela('CBTA No. 26 Martínez de la Torre',                 'cbtis',           $mtt); // Agropecuario
        $escuela('CECYTE Veracruz Plantel Martínez de la Torre',     'cecyte',           $mtt);

        // — Públicas estatales —
        $escuela('COBAEV Plantel 08 Martínez de la Torre',           'cobaev',           $mtt);
        $escuela('Preparatoria Veracruzana UV Región Martínez',      'preparatoria',     $mtt);
        $escuela('Telebachillerato Comunitario Martínez de la Torre','telebachillerato', $mtt);
        $escuela('TBC Colonia Lázaro Cárdenas',                      'telebachillerato', $mtt);
        $escuela('TBC El Palmar',                                    'telebachillerato', $mtt);
        $escuela('TBC El Raudal',                                    'telebachillerato', $mtt);
        $escuela('TBC Independencia',                                'telebachillerato', $mtt);
        $escuela('TBC La Concepción',                                'telebachillerato', $mtt);
        $escuela('TBC La Reforma',                                   'telebachillerato', $mtt);
        $escuela('TBC Nuevo Progreso',                               'telebachillerato', $mtt);
        $escuela('TBC Palmas de Abajo',                              'telebachillerato', $mtt);
        $escuela('TBC Plan de Ayala',                                'telebachillerato', $mtt);
        $escuela('TBC San Isidro',                                   'telebachillerato', $mtt);
        $escuela('TBC San José Buenavista',                          'telebachillerato', $mtt);
        $escuela('TBC Santa Fe',                                     'telebachillerato', $mtt);
        $escuela('TBC Tres Bocas',                                   'telebachillerato', $mtt);

        // — Privadas —
        $escuela('Colegio Hispano Mexicano Martínez de la Torre',    'preparatoria',     $mtt);
        $escuela('Instituto Educativo Martínez',                     'preparatoria',     $mtt);
        $escuela('Instituto México Martínez de la Torre',            'preparatoria',     $mtt);
        $escuela('Instituto Tecnológico de Estudios Superiores (ITES) Prepa', 'preparatoria', $mtt);
        $escuela('Colegio Cristóbal Colón Martínez de la Torre',     'preparatoria',     $mtt);
        $escuela('Colegio Cervantes Martínez de la Torre',           'preparatoria',     $mtt);
        $escuela('Preparatoria Incorporada José Vasconcelos',        'preparatoria',     $mtt);
        $escuela('Instituto Anglo Americano Martínez de la Torre',   'preparatoria',     $mtt);
        $escuela('Centro Educativo Nuevo Milenio',                   'preparatoria',     $mtt);
        $escuela('Preparatoria Incorporada Lázaro Cárdenas',         'preparatoria',     $mtt);
        $escuela('Instituto Educativo del Golfo',                    'preparatoria',     $mtt);

        // ═══════════════════════════════════════════════════════════════════════
        // TLAPACOYAN
        // ═══════════════════════════════════════════════════════════════════════
        $tlap = $municipio('Tlapacoyan');

        $escuela('COBAEV Plantel 18 Tlapacoyan',                    'cobaev',           $tlap);
        $escuela('CBTIS No. 180 Tlapacoyan',                        'cbtis',            $tlap);
        $escuela('CECYTE Veracruz Plantel Tlapacoyan',              'cecyte',           $tlap);
        $escuela('Telebachillerato Comunitario Tlapacoyan',         'telebachillerato', $tlap);
        $escuela('TBC Altotonga (Tlapacoyan)',                      'telebachillerato', $tlap);
        $escuela('TBC El Encinal',                                  'telebachillerato', $tlap);
        $escuela('TBC Hueytamalco',                                 'telebachillerato', $tlap);
        $escuela('TBC Las Vigas',                                   'telebachillerato', $tlap);
        $escuela('TBC Pilares',                                     'telebachillerato', $tlap);
        $escuela('Instituto Tlapacoyan',                            'preparatoria',     $tlap);
        $escuela('Colegio Ángel Álvaro Bretón Tlapacoyan',         'preparatoria',     $tlap);
        $escuela('Preparatoria Incorporada Tlapacoyan',             'preparatoria',     $tlap);

        // ═══════════════════════════════════════════════════════════════════════
        // MISANTLA
        // ═══════════════════════════════════════════════════════════════════════
        $mis = $municipio('Misantla');

        $escuela('COBAEV Plantel 16 Misantla',                      'cobaev',           $mis);
        $escuela('CBTIS No. 147 Misantla',                          'cbtis',            $mis);
        $escuela('Preparatoria UV Misantla',                        'preparatoria',     $mis);
        $escuela('CECYTE Veracruz Plantel Misantla',                'cecyte',           $mis);
        $escuela('Telebachillerato Comunitario Misantla',           'telebachillerato', $mis);
        $escuela('TBC Colonia Aguilera',                            'telebachillerato', $mis);
        $escuela('TBC El Potrero',                                  'telebachillerato', $mis);
        $escuela('TBC Juan Jacobo Torres',                          'telebachillerato', $mis);
        $escuela('TBC Rancho Nuevo',                                'telebachillerato', $mis);
        $escuela('Instituto Misantla',                              'preparatoria',     $mis);
        $escuela('Colegio Fundadores Misantla',                     'preparatoria',     $mis);
        $escuela('Preparatoria Incorporada Misantla',               'preparatoria',     $mis);

        // ═══════════════════════════════════════════════════════════════════════
        // VEGA DE ALATORRE
        // ═══════════════════════════════════════════════════════════════════════
        $veg = $municipio('Vega de Alatorre');

        $escuela('COBAEV Plantel Vega de Alatorre',                 'cobaev',           $veg);
        $escuela('Telebachillerato Comunitario Vega de Alatorre',   'telebachillerato', $veg);
        $escuela('TBC Barra de Cazones',                            'telebachillerato', $veg);
        $escuela('TBC La Guadalupe',                                'telebachillerato', $veg);
        $escuela('TBC La Mancha',                                   'telebachillerato', $veg);
        $escuela('TBC Paso del Toro',                               'telebachillerato', $veg);
        $escuela('TBC Poblado Álvaro Obregón',                      'telebachillerato', $veg);
        $escuela('Preparatoria Vega de Alatorre',                   'preparatoria',     $veg);

        // ═══════════════════════════════════════════════════════════════════════
        // NAUTLA
        // ═══════════════════════════════════════════════════════════════════════
        $nau = $municipio('Nautla');

        $escuela('COBAEV Plantel Nautla',                           'cobaev',           $nau);
        $escuela('Telebachillerato Comunitario Nautla',             'telebachillerato', $nau);
        $escuela('TBC Barra de Nautla',                             'telebachillerato', $nau);
        $escuela('TBC La Victoria',                                 'telebachillerato', $nau);
        $escuela('TBC Palma Sola',                                  'telebachillerato', $nau);

        // ═══════════════════════════════════════════════════════════════════════
        // GUTIÉRREZ ZAMORA
        // ═══════════════════════════════════════════════════════════════════════
        $gut = $municipio('Gutiérrez Zamora');

        $escuela('COBAEV Plantel Gutiérrez Zamora',                 'cobaev',           $gut);
        $escuela('CBTIS No. 78 Gutiérrez Zamora',                   'cbtis',            $gut);
        $escuela('Telebachillerato Comunitario Gutiérrez Zamora',   'telebachillerato', $gut);
        $escuela('TBC El Chote',                                    'telebachillerato', $gut);
        $escuela('TBC La Guadalupe (G.Z.)',                         'telebachillerato', $gut);
        $escuela('TBC Xopilapa',                                    'telebachillerato', $gut);
        $escuela('Preparatoria Incorporada Gutiérrez Zamora',       'preparatoria',     $gut);
        $escuela('Instituto Educativo Cuauhtémoc',                  'preparatoria',     $gut);

        // ═══════════════════════════════════════════════════════════════════════
        // TECOLUTLA
        // ═══════════════════════════════════════════════════════════════════════
        $tec = $municipio('Tecolutla');

        $escuela('COBAEV Plantel Tecolutla',                        'cobaev',           $tec);
        $escuela('Telebachillerato Comunitario Tecolutla',          'telebachillerato', $tec);
        $escuela('TBC El Remolino',                                 'telebachillerato', $tec);
        $escuela('TBC Miahuatlán',                                  'telebachillerato', $tec);
        $escuela('TBC Paso del Correo',                             'telebachillerato', $tec);
        $escuela('TBC San Rafael',                                  'telebachillerato', $tec);

        // ═══════════════════════════════════════════════════════════════════════
        // ESPINAL
        // ═══════════════════════════════════════════════════════════════════════
        $esp = $municipio('Espinal');

        $escuela('COBAEV Plantel Espinal',                          'cobaev',           $esp);
        $escuela('Telebachillerato Comunitario Espinal',            'telebachillerato', $esp);
        $escuela('TBC El Porvenir',                                 'telebachillerato', $esp);
        $escuela('TBC Xochimilco (Espinal)',                        'telebachillerato', $esp);

        // ═══════════════════════════════════════════════════════════════════════
        // CAZONES DE HERRERA
        // ═══════════════════════════════════════════════════════════════════════
        $caz = $municipio('Cazones de Herrera');

        $escuela('COBAEV Plantel Cazones de Herrera',               'cobaev',           $caz);
        $escuela('Telebachillerato Comunitario Cazones de Herrera', 'telebachillerato', $caz);
        $escuela('TBC Barra de Cazones de Herrera',                 'telebachillerato', $caz);
        $escuela('TBC Punta Arena',                                 'telebachillerato', $caz);

        // ═══════════════════════════════════════════════════════════════════════
        // ÁLAMO TEMAPACHE
        // ═══════════════════════════════════════════════════════════════════════
        $ala = $municipio('Álamo Temapache');

        $escuela('COBAEV Plantel Álamo Temapache',                  'cobaev',           $ala);
        $escuela('CBTIS No. 71 Álamo Temapache',                    'cbtis',            $ala);
        $escuela('CECYTE Veracruz Plantel Álamo',                   'cecyte',           $ala);
        $escuela('Telebachillerato Comunitario Álamo',              'telebachillerato', $ala);
        $escuela('TBC Chinampa de Gorostiza',                       'telebachillerato', $ala);
        $escuela('TBC El Chote Dos',                                'telebachillerato', $ala);
        $escuela('TBC Paso de Piedra',                              'telebachillerato', $ala);
        $escuela('TBC Tierra Blanca (Álamo)',                       'telebachillerato', $ala);
        $escuela('Instituto Álamo',                                 'preparatoria',     $ala);
        $escuela('Preparatoria Incorporada Temapache',              'preparatoria',     $ala);
        $escuela('Colegio Frontera Temapache',                      'preparatoria',     $ala);

        // ═══════════════════════════════════════════════════════════════════════
        // TIHUATLÁN
        // ═══════════════════════════════════════════════════════════════════════
        $tih = $municipio('Tihuatlán');

        $escuela('COBAEV Plantel Tihuatlán',                        'cobaev',           $tih);
        $escuela('CBTIS No. 214 Tihuatlán',                         'cbtis',            $tih);
        $escuela('Telebachillerato Comunitario Tihuatlán',          'telebachillerato', $tih);
        $escuela('TBC Alazán',                                      'telebachillerato', $tih);
        $escuela('TBC El Coyol',                                    'telebachillerato', $tih);
        $escuela('TBC Mecatepec',                                   'telebachillerato', $tih);
        $escuela('TBC Tenexco',                                     'telebachillerato', $tih);
        $escuela('Preparatoria Incorporada Tihuatlán',              'preparatoria',     $tih);

        // ═══════════════════════════════════════════════════════════════════════
        // PAPANTLA
        // ═══════════════════════════════════════════════════════════════════════
        $pap = $municipio('Papantla');

        $escuela('COBAEV Plantel 20 Papantla',                      'cobaev',           $pap);
        $escuela('CBTIS No. 65 Papantla',                           'cbtis',            $pap);
        $escuela('CBTA No. 18 Papantla',                            'cbtis',            $pap);
        $escuela('CECYTE Veracruz Plantel Papantla',                'cecyte',           $pap);
        $escuela('Preparatoria UV Papantla',                        'preparatoria',     $pap);
        $escuela('Telebachillerato Comunitario Papantla',           'telebachillerato', $pap);
        $escuela('Instituto Veracruzano de Cultura Papantla',       'preparatoria',     $pap);
        $escuela('Colegio América Papantla',                        'preparatoria',     $pap);
        $escuela('Instituto Totonaca Papantla',                     'preparatoria',     $pap);
        $escuela('Preparatoria Incorporada Papantla',               'preparatoria',     $pap);

        // ═══════════════════════════════════════════════════════════════════════
        // COATZINTLA
        // ═══════════════════════════════════════════════════════════════════════
        $coat = $municipio('Coatzintla');

        $escuela('COBAEV Plantel Coatzintla',                       'cobaev',           $coat);
        $escuela('Telebachillerato Comunitario Coatzintla',         'telebachillerato', $coat);
        $escuela('TBC El Chote (Coatzintla)',                       'telebachillerato', $coat);
        $escuela('TBC Potrero del Llano',                           'telebachillerato', $coat);
        $escuela('Preparatoria Incorporada Coatzintla',             'preparatoria',     $coat);

        // ═══════════════════════════════════════════════════════════════════════
        // IXHUATLÁN DE MADERO
        // ═══════════════════════════════════════════════════════════════════════
        $ixh = $municipio('Ixhuatlán de Madero');

        $escuela('COBAEV Plantel Ixhuatlán de Madero',              'cobaev',           $ixh);
        $escuela('CBTIS No. 164 Ixhuatlán de Madero',               'cbtis',            $ixh);
        $escuela('Telebachillerato Comunitario Ixhuatlán de Madero','telebachillerato', $ixh);
        $escuela('TBC Chicontepec (Ixhuatlán)',                     'telebachillerato', $ixh);
        $escuela('TBC La Florida',                                  'telebachillerato', $ixh);
        $escuela('TBC Tepetate',                                    'telebachillerato', $ixh);

        // ═══════════════════════════════════════════════════════════════════════
        // CASTILLO DE TEAYO
        // ═══════════════════════════════════════════════════════════════════════
        $cas = $municipio('Castillo de Teayo');

        $escuela('COBAEV Plantel Castillo de Teayo',                'cobaev',           $cas);
        $escuela('Telebachillerato Comunitario Castillo de Teayo',  'telebachillerato', $cas);
        $escuela('TBC El Tajín (Castillo)',                         'telebachillerato', $cas);
        $escuela('TBC Tancoco',                                     'telebachillerato', $cas);
        $escuela('TBC Zacamixtle',                                  'telebachillerato', $cas);

        $this->command->info('✓ Escuelas de bachillerato sembradas correctamente.');
    }
}
