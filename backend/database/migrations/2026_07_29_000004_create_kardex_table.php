<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * S4-07: registro permanente del historial académico del alumno. Se alimenta
 * al firmar el acta de calificaciones de cada grupo/materia (retención
 * PERMANENTE, TecNM-AC-PO-003 paso 10).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kardex', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->foreignUuid('calificacion_id')->constrained('calificaciones');
            $table->foreignUuid('carga_academica_id')->nullable()->constrained('cargas_academicas')->nullOnDelete();
            $table->foreignUuid('grupo_id')->constrained('grupos');
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->string('materia_nombre');
            $table->decimal('promedio', 5, 2)->nullable();
            $table->boolean('acreditado')->nullable();
            $table->enum('tipo_curso', ['ordinario', 'repeticion', 'especial'])->default('ordinario');
            $table->foreignUuid('acta_calificaciones_id')->nullable()->constrained('actas_calificaciones')->nullOnDelete();
            $table->date('fecha_registro');
            $table->timestamps();
            $table->unique(['alumno_id', 'calificacion_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kardex');
    }
};
