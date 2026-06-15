<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alumnos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable(); // se crea al activar acceso al sistema
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->uuid('inscripcion_id')->unique();
            $table->foreign('inscripcion_id')->references('id')->on('inscripciones');
            $table->string('numero_control')->unique();
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras');
            $table->uuid('periodo_ingreso_id');
            $table->foreign('periodo_ingreso_id')->references('id')->on('periodos');
            $table->unsignedTinyInteger('semestre_actual')->default(1);
            $table->string('estatus')->default('activo'); // activo|baja_temporal|baja_definitiva|egresado
            $table->date('fecha_cambio_estatus')->nullable();
            // TecNM-AC-PO-001-04: quién puede consultar el expediente
            $table->string('autorizacion_consulta_expediente')->default('nadie'); // padre|madre|ambos|tutor|otro|nadie
            // TecNM-AC-PO-001-05: bloqueo de reinscripción si no entrega certificado
            $table->boolean('pendiente_certificado_bachillerato')->default(false);
            $table->text('observaciones_estatus')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumnos');
    }
};
