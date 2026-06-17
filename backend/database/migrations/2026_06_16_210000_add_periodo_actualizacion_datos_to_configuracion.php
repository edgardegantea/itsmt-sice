<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->date('fecha_inicio_actualizacion_datos')->nullable()->after('responsable_servicios_escolares');
            $table->date('fecha_fin_actualizacion_datos')->nullable()->after('fecha_inicio_actualizacion_datos');
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->dropColumn(['fecha_inicio_actualizacion_datos', 'fecha_fin_actualizacion_datos']);
        });
    }
};
