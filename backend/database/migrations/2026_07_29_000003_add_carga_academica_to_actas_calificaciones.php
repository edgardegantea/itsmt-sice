<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actas_calificaciones', function (Blueprint $table) {
            // El acta debe ser por grupo/MATERIA, no solo por grupo — un grupo puede
            // agrupar varias materias (cargas académicas N:N) con distinto docente.
            $table->foreignUuid('carga_academica_id')->nullable()->after('grupo_id')
                ->constrained('cargas_academicas')->nullOnDelete();
        });

        Schema::table('actas_calificaciones', function (Blueprint $table) {
            $table->dropUnique(['grupo_id', 'periodo_id']);
            $table->unique(['grupo_id', 'periodo_id', 'carga_academica_id'], 'actas_calificaciones_grupo_periodo_carga_unique');
        });
    }

    public function down(): void
    {
        Schema::table('actas_calificaciones', function (Blueprint $table) {
            $table->dropUnique('actas_calificaciones_grupo_periodo_carga_unique');
            $table->unique(['grupo_id', 'periodo_id']);
            $table->dropConstrainedForeignId('carga_academica_id');
        });
    }
};
