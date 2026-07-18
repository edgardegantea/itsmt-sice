<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 26 — Cuerpos Académicos e Investigación
        Schema::create('cuerpos_academicos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre');
            $table->string('clave')->unique();
            $table->string('lgac_principal')->nullable();
            $table->string('grado_consolidacion')->default('en_formacion'); // en_formacion/en_consolidacion/consolidado
            $table->date('fecha_registro');
            $table->date('fecha_vigencia')->nullable();
            $table->foreignUuid('lider_id')->nullable()->constrained('users');
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('lgac', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cuerpo_academico_id')->constrained('cuerpos_academicos')->cascadeOnDelete();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        Schema::create('integrantes_ca', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cuerpo_academico_id')->constrained('cuerpos_academicos')->cascadeOnDelete();
            $table->foreignUuid('docente_id')->constrained('users');
            $table->string('rol')->default('integrante'); // lider/integrante/colaborador
            $table->date('fecha_ingreso');
            $table->date('fecha_baja')->nullable();
            $table->timestamps();
        });

        Schema::create('proyectos_investigacion', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cuerpo_academico_id')->nullable()->constrained('cuerpos_academicos');
            $table->string('titulo');
            $table->string('tipo')->default('interno'); // interno/externo/financiado
            $table->string('fuente_financiamiento')->nullable();
            $table->decimal('monto', 12, 2)->nullable();
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->string('estatus')->default('registrado'); // registrado/en_proceso/concluido/cancelado
            $table->foreignUuid('responsable_id')->constrained('users');
            $table->text('descripcion')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('producciones_academicas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('proyecto_id')->nullable()->constrained('proyectos_investigacion');
            $table->foreignUuid('cuerpo_academico_id')->nullable()->constrained('cuerpos_academicos');
            $table->string('tipo'); // articulo/libro/capitulo/ponencia/patente/tesis_dirigida
            $table->string('titulo');
            $table->foreignUuid('autor_principal_id')->constrained('users');
            $table->text('coautores')->nullable();
            $table->string('medio_difusion')->nullable();
            $table->date('fecha_publicacion');
            $table->string('doi_isbn')->nullable();
            $table->string('archivo_path')->nullable();
            $table->string('estatus')->default('registrada'); // registrada/validada
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producciones_academicas');
        Schema::dropIfExists('proyectos_investigacion');
        Schema::dropIfExists('integrantes_ca');
        Schema::dropIfExists('lgac');
        Schema::dropIfExists('cuerpos_academicos');
    }
};
