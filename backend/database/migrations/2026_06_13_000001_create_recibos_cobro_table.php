<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recibos_cobro', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('inscripcion_id');
            $table->foreign('inscripcion_id')->references('id')->on('inscripciones');
            $table->uuid('alumno_id');
            $table->foreign('alumno_id')->references('id')->on('alumnos');
            // CFDI SAT
            $table->string('folio_fiscal')->unique();        // UUID del CFDI emitido por el SAT
            $table->string('rfc_emisor')->default('TNM140723GFA');
            $table->string('nombre_pagador');               // nombre del estudiante o tutor que paga
            $table->string('rfc_pagador')->nullable();      // XAXX010101000 si no tiene RFC
            $table->string('concepto');                     // "Cuota de inscripción 2025-A", etc.
            $table->decimal('importe', 8, 2);
            $table->text('sello_digital_cfdi')->nullable(); // sello digital emitido por el SAT
            $table->string('numero_certificado_sat')->nullable();
            $table->uuid('registrado_por')->nullable();
            $table->foreign('registrado_por')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recibos_cobro');
    }
};
