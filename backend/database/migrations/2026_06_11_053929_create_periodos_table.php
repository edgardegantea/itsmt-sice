<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('periodos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre');
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->boolean('activo')->default(false);
            $table->string('tipo')->default('ordinario'); // ordinario | verano | intersemestral
            $table->date('fecha_limite_baja_parcial')->nullable();   // ~10 días hábiles
            $table->date('fecha_limite_baja_temporal')->nullable();  // ~20 días hábiles
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('periodos');
    }
};
