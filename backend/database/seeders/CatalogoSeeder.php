<?php

namespace Database\Seeders;

use App\Domains\Catalogos\Models\Estado;
use App\Domains\Catalogos\Models\Municipio;
use App\Domains\Catalogos\Models\Turno;
use Illuminate\Database\Seeder;

class CatalogoSeeder extends Seeder
{
    public function run(): void
    {
        // ── Turnos ────────────────────────────────────────────────────────────
        $turnos = [
            ['nombre' => 'Matutino',   'clave' => 'matutino',   'activo' => true],
            ['nombre' => 'Vespertino', 'clave' => 'vespertino', 'activo' => true],
        ];
        foreach ($turnos as $t) {
            Turno::firstOrCreate(['clave' => $t['clave']], $t);
        }

        // ── Estados ───────────────────────────────────────────────────────────
        $estados = [
            ['nombre' => 'Aguascalientes',       'clave_curp' => 'AS'],
            ['nombre' => 'Baja California',       'clave_curp' => 'BC'],
            ['nombre' => 'Baja California Sur',   'clave_curp' => 'BS'],
            ['nombre' => 'Campeche',              'clave_curp' => 'CC'],
            ['nombre' => 'Coahuila',              'clave_curp' => 'CL'],
            ['nombre' => 'Colima',                'clave_curp' => 'CM'],
            ['nombre' => 'Chiapas',               'clave_curp' => 'CS'],
            ['nombre' => 'Chihuahua',             'clave_curp' => 'CH'],
            ['nombre' => 'Ciudad de México',      'clave_curp' => 'DF'],
            ['nombre' => 'Durango',               'clave_curp' => 'DG'],
            ['nombre' => 'Estado de México',      'clave_curp' => 'MC'],
            ['nombre' => 'Guanajuato',            'clave_curp' => 'GT'],
            ['nombre' => 'Guerrero',              'clave_curp' => 'GR'],
            ['nombre' => 'Hidalgo',               'clave_curp' => 'HG'],
            ['nombre' => 'Jalisco',               'clave_curp' => 'JC'],
            ['nombre' => 'Michoacán',             'clave_curp' => 'MN'],
            ['nombre' => 'Morelos',               'clave_curp' => 'MS'],
            ['nombre' => 'Nayarit',               'clave_curp' => 'NT'],
            ['nombre' => 'Nuevo León',            'clave_curp' => 'NL'],
            ['nombre' => 'Oaxaca',                'clave_curp' => 'OC'],
            ['nombre' => 'Puebla',                'clave_curp' => 'PL'],
            ['nombre' => 'Querétaro',             'clave_curp' => 'QT'],
            ['nombre' => 'Quintana Roo',          'clave_curp' => 'QR'],
            ['nombre' => 'San Luis Potosí',       'clave_curp' => 'SP'],
            ['nombre' => 'Sinaloa',               'clave_curp' => 'SL'],
            ['nombre' => 'Sonora',                'clave_curp' => 'SR'],
            ['nombre' => 'Tabasco',               'clave_curp' => 'TC'],
            ['nombre' => 'Tamaulipas',            'clave_curp' => 'TS'],
            ['nombre' => 'Tlaxcala',              'clave_curp' => 'TL'],
            ['nombre' => 'Veracruz',              'clave_curp' => 'VZ'],
            ['nombre' => 'Yucatán',              'clave_curp' => 'YN'],
            ['nombre' => 'Zacatecas',             'clave_curp' => 'ZS'],
            ['nombre' => 'Nacido en el extranjero','clave_curp'=> 'NE'],
        ];

        foreach ($estados as $e) {
            Estado::firstOrCreate(['clave_curp' => $e['clave_curp']], $e);
        }

        // ── Municipios de Veracruz (zona de influencia del ITSMT) ─────────────
        $veracruz = Estado::where('clave_curp', 'VZ')->first();
        if ($veracruz) {
            $municipiosVz = [
                'Martínez de la Torre', 'Tlapacoyan', 'Misantla', 'Vega de Alatorre',
                'Nautla', 'Papantla', 'Poza Rica', 'Xalapa', 'Veracruz', 'Coatepec',
                'Córdoba', 'Orizaba', 'Tuxpan', 'Álamo Temapache', 'Tihuatlán',
                'Espinal', 'Tecolutla', 'Gutiérrez Zamora', 'Cazones de Herrera',
                'Coatzintla', 'Castillo de Teayo', 'Cerro Azul', 'El Higo',
                'Tantoyuca', 'Chicontepec', 'Ixhuatlán de Madero',
            ];
            foreach ($municipiosVz as $nombre) {
                Municipio::firstOrCreate(
                    ['estado_id' => $veracruz->id, 'nombre' => $nombre]
                );
            }
        }
    }
}
