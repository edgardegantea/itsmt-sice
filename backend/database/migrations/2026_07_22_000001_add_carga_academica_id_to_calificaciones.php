<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Un grupo puede tener varias cargas_academicas (varias materias/docentes),
        // por lo que una calificación debe identificar la materia exacta que califica,
        // no adivinarla a partir de la primera carga del grupo.
        Schema::table('calificaciones', function (Blueprint $table) {
            $table->foreignUuid('carga_academica_id')
                ->nullable()
                ->after('grupo_id')
                ->constrained('cargas_academicas')
                ->nullOnDelete();
        });

        // Backfill: solo se puede resolver sin ambigüedad cuando el grupo tenía
        // una única carga académica; el resto queda null (dato histórico ambiguo).
        DB::table('calificaciones')
            ->whereNull('carga_academica_id')
            ->select('id', 'grupo_id')
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $row) {
                    $cargaIds = DB::table('cargas_academicas')
                        ->where('grupo_id', $row->grupo_id)
                        ->whereNull('deleted_at')
                        ->pluck('id');

                    if ($cargaIds->count() === 1) {
                        DB::table('calificaciones')
                            ->where('id', $row->id)
                            ->update(['carga_academica_id' => $cargaIds->first()]);
                    }
                }
            });

        Schema::table('calificaciones', function (Blueprint $table) {
            $table->dropUnique('calificaciones_alumno_id_grupo_id_unique');
            $table->unique(['alumno_id', 'grupo_id', 'carga_academica_id'], 'calificaciones_alumno_grupo_carga_unique');
        });

        Schema::table('alertas_baja_definitiva', function (Blueprint $table) {
            $table->foreignUuid('carga_academica_id')
                ->nullable()
                ->after('grupo_id')
                ->constrained('cargas_academicas')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('alertas_baja_definitiva', function (Blueprint $table) {
            $table->dropConstrainedForeignId('carga_academica_id');
        });

        Schema::table('calificaciones', function (Blueprint $table) {
            $table->dropUnique('calificaciones_alumno_grupo_carga_unique');
            $table->unique(['alumno_id', 'grupo_id'], 'calificaciones_alumno_id_grupo_id_unique');
            $table->dropConstrainedForeignId('carga_academica_id');
        });
    }
};
