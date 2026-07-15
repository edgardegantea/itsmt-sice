<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 21 — TecNM-AC-PO-002: Calendario Escolar
        Schema::create('calendarios_escolar', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->string('periodo_escolar');
            $table->json('actividades')->default('[]');
            $table->string('elaboro_nombre')->nullable();
            $table->date('elaboro_fecha')->nullable();
            $table->string('autorizo_nombre')->nullable();
            $table->date('autorizo_fecha')->nullable();
            $table->foreignUuid('autorizado_por')->nullable()->constrained('users');
            $table->boolean('autorizado')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendarios_escolar');
    }
};
