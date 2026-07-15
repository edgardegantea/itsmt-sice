<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 24 — Biblioteca
        Schema::create('acervo', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('isbn')->nullable()->unique();
            $table->string('titulo');
            $table->string('autor');
            $table->string('editorial')->nullable();
            $table->smallInteger('anio_edicion')->nullable();
            $table->string('edicion')->nullable();
            $table->string('categoria')->nullable();
            $table->string('clasificacion_dewey')->nullable();
            $table->integer('total_ejemplares')->default(0);
            $table->integer('ejemplares_disponibles')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('ejemplares', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('acervo_id')->constrained('acervo')->cascadeOnDelete();
            $table->string('codigo_barras')->unique();
            $table->string('numero_adquisicion')->nullable();
            $table->string('estatus')->default('disponible');
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('prestamos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ejemplar_id')->constrained('ejemplares');
            $table->foreignUuid('user_id')->constrained('users');
            $table->date('fecha_prestamo');
            $table->date('fecha_devolucion_esperada');
            $table->date('fecha_devolucion_real')->nullable();
            $table->string('estatus')->default('activo');
            $table->integer('renovaciones')->default(0);
            $table->decimal('multa_acumulada', 8, 2)->default(0);
            $table->boolean('multa_pagada')->default(false);
            $table->foreignUuid('atendido_por')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('reservas_biblioteca', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('acervo_id')->constrained('acervo')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users');
            $table->string('estatus')->default('activa');
            $table->date('fecha_expiracion')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservas_biblioteca');
        Schema::dropIfExists('prestamos');
        Schema::dropIfExists('ejemplares');
        Schema::dropIfExists('acervo');
    }
};
