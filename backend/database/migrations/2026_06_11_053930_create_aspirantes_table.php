<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aspirantes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Datos personales
            $table->string('nombres');
            $table->string('apellido_paterno');
            $table->string('apellido_materno')->nullable();
            $table->string('curp', 18)->unique();
            $table->date('fecha_nacimiento');
            $table->string('sexo', 10); // masculino | femenino
            $table->string('municipio_procedencia', 120);
            $table->string('escuela_bachillerato', 200);
            $table->decimal('promedio_bachillerato', 4, 2);
            $table->string('turno_preferido', 20); // matutino | vespertino
            // Contacto
            $table->string('email')->unique();
            $table->string('telefono', 15)->nullable();
            // Preinscripción TecNM
            $table->string('folio_preinscripcion_tecnm')->nullable(); // ingreso.tecnm.mx
            $table->string('folio_exani')->nullable();
            $table->decimal('puntaje_exani', 8, 2)->nullable();
            // Relaciones
            $table->uuid('carrera_id');
            $table->foreign('carrera_id')->references('id')->on('carreras');
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos');
            // Estado
            $table->string('estatus')->default('pendiente'); // pendiente | aceptado | rechazado
            $table->text('motivo_rechazo')->nullable();
            $table->json('documentos')->nullable(); // acta_nacimiento, curp, certificado, foto, etc.
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aspirantes');
    }
};
