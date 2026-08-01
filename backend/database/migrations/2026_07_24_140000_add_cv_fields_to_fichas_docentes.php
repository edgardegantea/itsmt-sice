<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Campos de CV que el propio docente mantiene actualizados (a diferencia de
 * tipo_contrato/categoria/fecha_ingreso, que son datos administrativos que
 * solo el admin edita). Ver FichaDocenteController::miFicha()/actualizarMiCv().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fichas_docentes', function (Blueprint $table) {
            $table->text('semblanza')->nullable()->after('titulos_academicos');
            $table->json('experiencia_laboral')->nullable()->after('semblanza')
                ->comment('[{ puesto, institucion, fecha_inicio, fecha_fin, descripcion }]');
            $table->json('cursos_capacitacion')->nullable()->after('experiencia_laboral')
                ->comment('[{ nombre, institucion, fecha, horas }]');
            $table->json('publicaciones')->nullable()->after('cursos_capacitacion')
                ->comment('[{ titulo, medio, anio, url }]');
            $table->timestamp('cv_actualizado_en')->nullable()->after('publicaciones');
        });
    }

    public function down(): void
    {
        Schema::table('fichas_docentes', function (Blueprint $table) {
            $table->dropColumn(['semblanza', 'experiencia_laboral', 'cursos_capacitacion', 'publicaciones', 'cv_actualizado_en']);
        });
    }
};
