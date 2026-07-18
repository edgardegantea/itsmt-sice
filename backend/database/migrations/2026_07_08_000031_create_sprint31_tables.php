<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 31 — Seguridad Informática
        Schema::create('two_factor_secrets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->text('secret'); // base32, cifrado vía cast 'encrypted'
            $table->text('recovery_codes')->nullable(); // json cifrado de hashes
            $table->boolean('enabled')->default(false);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('incidentes_seguridad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tipo'); // fuerza_bruta_sospechosa/acceso_no_autorizado/otro
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address', 64)->nullable();
            $table->text('descripcion')->nullable();
            $table->string('severidad')->default('media'); // baja/media/alta/critica
            $table->string('estatus')->default('abierto'); // abierto/en_revision/cerrado
            $table->timestamp('detectado_en')->useCurrent();
            $table->timestamp('resuelto_en')->nullable();
            $table->foreignUuid('resuelto_por')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidentes_seguridad');
        Schema::dropIfExists('two_factor_secrets');
    }
};
