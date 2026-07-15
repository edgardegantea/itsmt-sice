<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 25 — Acreditación y Calidad ISO/CACEI
        Schema::create('evidencias_calidad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('periodo_id')->nullable()->constrained('periodos');
            $table->string('proceso');
            $table->string('indicador');
            $table->string('tipo_evidencia');
            $table->string('archivo_path')->nullable();
            $table->string('archivo_nombre')->nullable();
            $table->text('descripcion')->nullable();
            $table->date('fecha_evidencia');
            $table->string('estatus')->default('pendiente');
            $table->foreignUuid('subido_por')->nullable()->constrained('users');
            $table->foreignUuid('validado_por')->nullable()->constrained('users');
            $table->timestamp('validado_en')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('no_conformidades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('folio')->unique();
            $table->string('tipo')->default('interna');
            $table->string('proceso');
            $table->text('descripcion');
            $table->string('clausula_iso')->nullable();
            $table->string('estatus')->default('abierta');
            $table->date('fecha_deteccion');
            $table->date('fecha_cierre_esperada')->nullable();
            $table->date('fecha_cierre_real')->nullable();
            $table->foreignUuid('detectado_por')->nullable()->constrained('users');
            $table->foreignUuid('responsable_id')->nullable()->constrained('users');
            $table->foreignUuid('cerrado_por')->nullable()->constrained('users');
            $table->text('causa_raiz')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('acciones_correctivas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('no_conformidad_id')->constrained('no_conformidades')->cascadeOnDelete();
            $table->text('descripcion');
            $table->date('fecha_compromiso');
            $table->date('fecha_implementacion')->nullable();
            $table->string('estatus')->default('pendiente');
            $table->foreignUuid('responsable_id')->nullable()->constrained('users');
            $table->text('evidencia_implementacion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acciones_correctivas');
        Schema::dropIfExists('no_conformidades');
        Schema::dropIfExists('evidencias_calidad');
    }
};
