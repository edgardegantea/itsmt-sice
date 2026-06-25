<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Normaliza las claves de carreras al estándar oficial ITSMT.
 *
 * Proceso:
 *  1. Reasigna alumnos/aspirantes/inscripciones de carreras duplicadas a la carrera canónica.
 *  2. Elimina las carreras duplicadas (ya sin referencias).
 *  3. Renombra las claves canónicas al estándar oficial.
 *  4. Actualiza el prefijo en las claves internas de materias.
 *
 * Mapa de fusión (duplicado → canónica-antes-de-renombrar):
 *   IGEM    → IGE     IGE-SAB  → IGE
 *   IIAS    → IAS     IIAS-SAB → IAS
 *   IIA     → IAL
 *   IIN-SAB → IIN
 *   ISC-SAB → ISC
 *
 * Renombrado final (clave_vieja → clave_nueva):
 *   IGE → IGEM   IIN → IIND   ISC → ISIC
 *   IAM → IAMB   IAS → IIAS   IAL → IIAL   IMT → IMCT
 */
return new class extends Migration
{
    /** duplicado → clave canónica (antes del renombrado) */
    private const FUSION = [
        'IGEM'     => 'IGE',
        'IGE-SAB'  => 'IGE',
        'IIAS'     => 'IAS',
        'IIAS-SAB' => 'IAS',
        'IIA'      => 'IAL',
        'IIN-SAB'  => 'IIN',
        'ISC-SAB'  => 'ISC',
    ];

    /** clave canónica vieja → clave oficial nueva */
    private const RENOMBRADO = [
        'IGE' => 'IGEM',
        'IIN' => 'IIND',
        'ISC' => 'ISIC',
        'IAM' => 'IAMB',
        'IAS' => 'IIAS',
        'IAL' => 'IIAL',
        'IMT' => 'IMCT',
    ];

    /** tablas con FK a carreras.id y sus columnas */
    private const TABLAS_FK = [
        'alumnos'           => 'carrera_id',
        'aspirantes'        => 'carrera_id',
        'inscripciones'     => 'carrera_id',
        'users'             => 'carrera_id',
        'orden_reinscripcion' => 'carrera_id',
        'grupos'            => 'carrera_id',
        'cargas_academicas' => null, // sin FK directa a carreras
    ];

    public function up(): void
    {
        DB::transaction(function () {
            // ── 1. Fusionar duplicados en canónicas ───────────────────────────
            foreach (self::FUSION as $duplicadoClave => $canonicaClave) {
                $duplicada = DB::table('carreras')->where('clave', $duplicadoClave)->first();
                $canonica  = DB::table('carreras')->where('clave', $canonicaClave)->first();

                if (! $duplicada || ! $canonica) {
                    continue;
                }

                // Reasignar referencias en todas las tablas con FK
                foreach (array_filter(self::TABLAS_FK) as $tabla => $columna) {
                    DB::table($tabla)
                        ->where($columna, $duplicada->id)
                        ->update([$columna => $canonica->id]);
                }

                // Mover materias huérfanas si las hubiera
                DB::table('materias')
                    ->where('carrera_id', $duplicada->id)
                    ->update(['carrera_id' => $canonica->id]);

                // Eliminar la carrera duplicada
                DB::table('carreras')->where('id', $duplicada->id)->delete();
            }

            // ── 2. Renombrar claves canónicas → oficiales ─────────────────────
            foreach (self::RENOMBRADO as $viejo => $nuevo) {
                $carrera = DB::table('carreras')->where('clave', $viejo)->first();
                if (! $carrera) {
                    continue;
                }

                DB::table('carreras')
                    ->where('id', $carrera->id)
                    ->update(['clave' => $nuevo]);

                // ── 3. Actualizar prefijo en claves internas de materias ───────
                // "IGE-ACF-0901" → "IGEM-ACF-0901"
                DB::table('materias')
                    ->where('carrera_id', $carrera->id)
                    ->whereNull('deleted_at')
                    ->get(['id', 'clave'])
                    ->each(function ($m) use ($viejo, $nuevo) {
                        if (str_starts_with($m->clave, $viejo . '-')) {
                            DB::table('materias')
                                ->where('id', $m->id)
                                ->update(['clave' => $nuevo . substr($m->clave, strlen($viejo))]);
                        }
                    });
            }
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            // Revertir renombrado de claves (no restaura duplicados eliminados)
            foreach (array_flip(self::RENOMBRADO) as $nuevo => $viejo) {
                $carrera = DB::table('carreras')->where('clave', $nuevo)->first();
                if (! $carrera) {
                    continue;
                }

                DB::table('carreras')
                    ->where('id', $carrera->id)
                    ->update(['clave' => $viejo]);

                DB::table('materias')
                    ->where('carrera_id', $carrera->id)
                    ->whereNull('deleted_at')
                    ->get(['id', 'clave'])
                    ->each(function ($m) use ($nuevo, $viejo) {
                        if (str_starts_with($m->clave, $nuevo . '-')) {
                            DB::table('materias')
                                ->where('id', $m->id)
                                ->update(['clave' => $viejo . substr($m->clave, strlen($nuevo))]);
                        }
                    });
            }
        });
    }
};
