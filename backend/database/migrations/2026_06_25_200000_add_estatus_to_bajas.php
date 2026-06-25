<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bajas', function (Blueprint $table) {
            $table->enum('estatus', ['pendiente', 'aprobada', 'rechazada'])
                ->default('aprobada') // bajas registradas por admin se aprueban de inmediato
                ->after('tipo_baja');
        });
    }

    public function down(): void
    {
        Schema::table('bajas', function (Blueprint $table) {
            $table->dropColumn('estatus');
        });
    }
};
