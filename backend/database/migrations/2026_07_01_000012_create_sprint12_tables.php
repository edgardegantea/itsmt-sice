<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── S12-01: Sesiones de clase ─────────────────────────────────────────
        Schema::create('sesiones_clase', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->string('tema')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── S12-01: Asistencias por sesión ───────────────────────────────────
        Schema::create('asistencias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sesion_id')->constrained('sesiones_clase')->cascadeOnDelete();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->enum('estatus', ['presente', 'ausente', 'retardo', 'justificado'])->default('presente');
            $table->string('observacion')->nullable();
            $table->timestamps();

            $table->unique(['sesion_id', 'alumno_id']);
        });

        // ── S12-03: Alertas de inasistencia ──────────────────────────────────
        Schema::create('alertas_inasistencia', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->decimal('porcentaje_inasistencia', 5, 2);
            $table->boolean('leida_docente')->default(false);
            $table->boolean('leida_jefe')->default(false);
            $table->boolean('leida_director')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas_inasistencia');
        Schema::dropIfExists('asistencias');
        Schema::dropIfExists('sesiones_clase');
    }
};
