<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reglas para activar/desactivar el asistente de IA de la instrumentación didáctica.
 * Ámbitos: global (toda la institución), carrera, docente y grupo. Gana la regla más
 * específica: grupo > docente > carrera > global. Sin reglas, la IA está activa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reglas_ia', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('ambito', 20); // global | carrera | docente | grupo
            $table->uuid('referencia_id')->nullable(); // null solo en ámbito global
            $table->boolean('habilitada');
            $table->string('nota', 255)->nullable();
            $table->foreignUuid('actualizada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['ambito', 'referencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reglas_ia');
    }
};
