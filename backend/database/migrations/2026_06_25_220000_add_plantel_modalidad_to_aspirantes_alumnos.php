<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->enum('plantel', ['martinez_de_la_torre', 'vega_de_alatorre'])
                  ->default('martinez_de_la_torre')
                  ->after('modalidad_preferida');
            $table->enum('modalidad', ['escolarizado', 'sabatino'])
                  ->default('escolarizado')
                  ->after('plantel');
        });

        Schema::table('alumnos', function (Blueprint $table) {
            $table->enum('plantel', ['martinez_de_la_torre', 'vega_de_alatorre'])
                  ->default('martinez_de_la_torre')
                  ->after('pendiente_certificado_bachillerato');
            $table->enum('modalidad', ['escolarizado', 'sabatino'])
                  ->default('escolarizado')
                  ->after('plantel');
        });
    }

    public function down(): void
    {
        Schema::table('alumnos', function (Blueprint $table) {
            $table->dropColumn(['plantel', 'modalidad']);
        });
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropColumn(['plantel', 'modalidad']);
        });
    }
};
