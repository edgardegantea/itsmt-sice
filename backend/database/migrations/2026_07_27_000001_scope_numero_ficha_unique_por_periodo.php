<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `Aspirante::generarFicha()` numera folios de forma consecutiva por periodo_id
 * (backend/app/Domains/Admision/Models/Aspirante.php), pero el unique original
 * era global sobre `numero_ficha` — el primer aspirante de CUALQUIER periodo
 * siempre generaba "{año}-0001", chocando con el primer aspirante de cualquier
 * otro periodo. Se reemplaza por un unique compuesto (numero_ficha, periodo_id),
 * el mismo patrón que ya usa `aspirantes_email_periodo_unique` en esta tabla.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropUnique('aspirantes_numero_ficha_unique');
            $table->unique(['numero_ficha', 'periodo_id']);
        });
    }

    public function down(): void
    {
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropUnique(['numero_ficha', 'periodo_id']);
            $table->unique('numero_ficha');
        });
    }
};
