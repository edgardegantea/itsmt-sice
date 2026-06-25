<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Interruptor global: sólo superadmin puede activarlo
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->boolean('maestria_habilitada')->default(false)->after('radio_bordes');
        });

        Schema::table('aspirantes', function (Blueprint $table) {
            $table->enum('nivel', ['licenciatura', 'maestria'])
                  ->default('licenciatura')
                  ->after('modalidad');
        });

        Schema::table('alumnos', function (Blueprint $table) {
            $table->enum('nivel', ['licenciatura', 'maestria'])
                  ->default('licenciatura')
                  ->after('modalidad');
        });
    }

    public function down(): void
    {
        Schema::table('alumnos', function (Blueprint $table) {
            $table->dropColumn('nivel');
        });
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropColumn('nivel');
        });
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->dropColumn('maestria_habilitada');
        });
    }
};
