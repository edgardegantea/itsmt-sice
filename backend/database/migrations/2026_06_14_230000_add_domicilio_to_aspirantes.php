<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->string('calle', 150)->nullable()->after('municipio_procedencia');
            $table->string('colonia', 100)->nullable()->after('calle');
            $table->string('ciudad', 100)->nullable()->after('colonia');
            $table->string('estado_domicilio', 80)->nullable()->after('ciudad');
            $table->string('codigo_postal', 6)->nullable()->after('estado_domicilio');
        });
    }

    public function down(): void
    {
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropColumn(['calle', 'colonia', 'ciudad', 'estado_domicilio', 'codigo_postal']);
        });
    }
};
