<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Registro de las actas "de captura" que el docente genera desde la pantalla de
    // Captura de Calificaciones (folio + trazabilidad de quién la generó y, si aplica,
    // quién la firmó como representante de Control Escolar). Es un comprobante ligero,
    // distinto del acta oficial/permanente de Cierre de Curso (tabla actas_calificaciones).
    public function up(): void
    {
        Schema::create('actas_calificaciones_capturas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->foreignUuid('carga_academica_id')->constrained('cargas_academicas')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->nullable()->constrained('periodos')->nullOnDelete();
            $table->string('folio')->unique();
            $table->foreignUuid('generado_por')->constrained('users');
            $table->timestamp('generado_en');
            $table->foreignUuid('firmado_por')->nullable()->constrained('users');
            $table->timestamp('firmado_en')->nullable();
            $table->timestamps();
            $table->unique(['grupo_id', 'carga_academica_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actas_calificaciones_capturas');
    }
};
