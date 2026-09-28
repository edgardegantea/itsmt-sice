<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Llaves de acceso de solo lectura para herramientas externas (Power BI,
        // Looker Studio, Google Sheets) — autenticación por header en vez de sesión,
        // porque esas herramientas no pueden hacer el flujo de login de la SPA.
        Schema::create('api_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre', 100);
            $table->string('key_hash', 64)->unique(); // sha256 de la llave real, nunca se guarda en claro
            $table->string('key_prefix', 12); // primeros caracteres, solo para identificarla en la UI
            $table->uuid('creado_por_id');
            $table->foreign('creado_por_id')->references('id')->on('users')->cascadeOnDelete();
            $table->boolean('activa')->default(true);
            $table->timestamp('ultimo_uso_en')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};
