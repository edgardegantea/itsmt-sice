<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inscripciones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('aspirante_id');
            $table->foreign('aspirante_id')->references('id')->on('aspirantes');
            $table->string('numero_control')->unique(); // formato TecNM [AA][NNN][####]
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras');
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            $table->string('tipo_ingreso')->default('nuevo_ingreso'); // nuevo_ingreso|reingreso|traslado|equivalencia
            $table->string('tipo_ingreso_registro')->default('Licenciatura'); // para Libro de Registro NC
            $table->unsignedTinyInteger('semestre_ingreso')->default(1);
            $table->date('fecha_inscripcion');
            $table->uuid('inscrito_por')->nullable(); // FK→users
            $table->foreign('inscrito_por')->references('id')->on('users')->nullOnDelete();
            // Flags de documentos generados
            $table->boolean('carta_compromiso_generada')->default(false);
            $table->boolean('solicitud_inscripcion_generada')->default(false);
            $table->boolean('contrato_generado')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscripciones');
    }
};
