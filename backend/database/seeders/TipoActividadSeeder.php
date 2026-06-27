<?php

namespace Database\Seeders;

use App\Domains\Calidad\Models\TipoActividad;
use Illuminate\Database\Seeder;

class TipoActividadSeeder extends Seeder
{
    // 12 tipos oficiales TecNM — Capítulo 10 del Reglamento Estudiantil
    private const TIPOS = [
        ['clave' => 'TUTORIA',       'nombre' => 'Tutoría grupal',                              'horas_requeridas' => 20],
        ['clave' => 'DEPORTES',      'nombre' => 'Actividades deportivas',                       'horas_requeridas' => 20],
        ['clave' => 'CULTURA',       'nombre' => 'Actividades culturales',                       'horas_requeridas' => 20],
        ['clave' => 'INVESTIGACION', 'nombre' => 'Investigación científica y tecnológica',        'horas_requeridas' => 20],
        ['clave' => 'COMPETENCIAS',  'nombre' => 'Competencias académicas',                      'horas_requeridas' => 20],
        ['clave' => 'IDIOMAS',       'nombre' => 'Acreditación de idioma extranjero',            'horas_requeridas' => 20],
        ['clave' => 'CIVICAS',       'nombre' => 'Actividades cívicas y comunitarias',           'horas_requeridas' => 20],
        ['clave' => 'BRIGADISTAS',   'nombre' => 'Brigada universitaria',                        'horas_requeridas' => 20],
        ['clave' => 'VOLUNTARIADO',  'nombre' => 'Servicio voluntario social',                   'horas_requeridas' => 20],
        ['clave' => 'ARTE',          'nombre' => 'Artes escénicas y plásticas',                  'horas_requeridas' => 20],
        ['clave' => 'EMPRENDIMIENTO','nombre' => 'Emprendimiento e innovación',                  'horas_requeridas' => 20],
        ['clave' => 'LIDERAZGO',     'nombre' => 'Liderazgo estudiantil',                        'horas_requeridas' => 20],
    ];

    public function run(): void
    {
        foreach (self::TIPOS as $tipo) {
            TipoActividad::firstOrCreate(['clave' => $tipo['clave']], $tipo);
        }
    }
}
