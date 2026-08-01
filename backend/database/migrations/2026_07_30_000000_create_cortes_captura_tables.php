<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cortes_captura', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();
            $table->unsignedTinyInteger('numero'); // 1|2|3
            $table->string('nombre', 100)->nullable();
            $table->date('fecha_corte');
            $table->date('fecha_limite_captura');
            $table->timestamps();
            $table->unique(['periodo_id', 'numero']);
        });

        Schema::create('alertas_corte_captura', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('corte_captura_id');
            $table->foreign('corte_captura_id')->references('id')->on('cortes_captura')->cascadeOnDelete();
            $table->uuid('carga_academica_id');
            $table->foreign('carga_academica_id')->references('id')->on('cargas_academicas')->cascadeOnDelete();
            $table->uuid('docente_id');
            $table->foreign('docente_id')->references('id')->on('users')->cascadeOnDelete();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();
            $table->decimal('porcentaje_capturado', 5, 2)->default(0);
            $table->boolean('pendiente')->default(true);
            $table->boolean('leida_docente')->default(false);
            $table->boolean('leida_jefe')->default(false);
            $table->boolean('leida_director')->default(false);
            $table->timestamps();
            $table->unique(['corte_captura_id', 'carga_academica_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas_corte_captura');
        Schema::dropIfExists('cortes_captura');
    }
};
