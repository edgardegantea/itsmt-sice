<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alumno_carga_selecciones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('alumno_id');
            $table->uuid('carga_academica_id');
            $table->uuid('periodo_id');
            $table->timestamps();

            $table->foreign('alumno_id')->references('id')->on('alumnos')->onDelete('cascade');
            $table->foreign('carga_academica_id')->references('id')->on('cargas_academicas')->onDelete('cascade');
            $table->foreign('periodo_id')->references('id')->on('periodos')->onDelete('cascade');

            $table->unique(['alumno_id', 'carga_academica_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumno_carga_selecciones');
    }
};
