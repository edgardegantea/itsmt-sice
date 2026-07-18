<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 29 — Evaluación Docente ampliada (esqueleto, pendiente de diseño detallado)
        Schema::create('autoevaluaciones_docente', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->constrained('users');
            $table->foreignUuid('periodo_id')->nullable()->constrained('periodos');
            $table->string('estatus')->default('pendiente'); // pendiente/enviada
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('evaluaciones_area_docente', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->constrained('users');
            $table->foreignUuid('periodo_id')->nullable()->constrained('periodos');
            $table->foreignUuid('evaluador_id')->nullable()->constrained('users');
            $table->string('estatus')->default('pendiente'); // pendiente/completada
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('planes_mejora_docente', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->constrained('users');
            $table->foreignUuid('periodo_id')->nullable()->constrained('periodos');
            $table->string('estatus')->default('abierto'); // abierto/en_seguimiento/cerrado
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes_mejora_docente');
        Schema::dropIfExists('evaluaciones_area_docente');
        Schema::dropIfExists('autoevaluaciones_docente');
    }
};
