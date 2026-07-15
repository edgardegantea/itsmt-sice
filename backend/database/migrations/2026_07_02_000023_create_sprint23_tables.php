<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 23 — Módulo de Becas TecNM
        Schema::create('solicitudes_beca', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->string('tipo_beca');
            $table->decimal('promedio', 4, 2)->nullable();
            $table->decimal('ingreso_familiar', 10, 2)->nullable();
            $table->string('estatus')->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->foreignUuid('validado_por')->nullable()->constrained('users');
            $table->timestamp('validado_en')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['alumno_id', 'periodo_id', 'tipo_beca']);
        });

        Schema::create('becas_asignadas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('solicitud_beca_id')->constrained('solicitudes_beca');
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->string('tipo_beca');
            $table->decimal('monto_mensual', 10, 2)->nullable();
            $table->integer('duracion_meses')->nullable();
            $table->string('estatus')->default('activa');
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->text('motivo_cancelacion')->nullable();
            $table->foreignUuid('asignado_por')->nullable()->constrained('users');
            $table->foreignUuid('cancelado_por')->nullable()->constrained('users');
            $table->timestamp('cancelado_en')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('becas_asignadas');
        Schema::dropIfExists('solicitudes_beca');
    }
};
