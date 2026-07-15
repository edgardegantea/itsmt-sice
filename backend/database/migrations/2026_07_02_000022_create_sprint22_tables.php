<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 22 — Estados de Cuenta y Finanzas
        Schema::create('adeudos_detalle', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('adeudo_id')->constrained('adeudos')->cascadeOnDelete();
            $table->string('partida');
            $table->text('descripcion')->nullable();
            $table->decimal('monto', 10, 2);
            $table->timestamps();
        });

        Schema::create('pagos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->foreignUuid('adeudo_id')->nullable()->constrained('adeudos')->nullOnDelete();
            $table->foreignUuid('periodo_id')->nullable()->constrained('periodos');
            $table->decimal('monto', 10, 2);
            $table->string('concepto');
            $table->date('fecha_pago');
            $table->string('metodo_pago')->default('efectivo');
            $table->string('folio_cfdi')->nullable();
            $table->string('serie_cfdi')->nullable();
            $table->string('uuid_cfdi')->nullable();
            $table->foreignUuid('registrado_por')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos');
        Schema::dropIfExists('adeudos_detalle');
    }
};
