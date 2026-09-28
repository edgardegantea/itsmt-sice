<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fecha con verificación reforzada de check-in (foto obligatoria + geolocalización)
        // — activable/desactivable sin tocar configuración permanente del sistema.
        Schema::create('modos_examen', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periodo_id');
            $table->foreign('periodo_id')->references('id')->on('periodos')->cascadeOnDelete();
            $table->date('fecha');
            $table->uuid('activado_por_id');
            $table->foreign('activado_por_id')->references('id')->on('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['periodo_id', 'fecha']);
        });

        // Geolocalización opcional del check-in — solo se captura y queda como dato
        // informativo adjunto; no hay coordenadas de aula guardadas para validar un
        // radio real todavía, así que no se rechaza ningún check-in por esto.
        Schema::table('asistencias', function (Blueprint $table) {
            $table->decimal('geo_lat', 10, 7)->nullable()->after('foto_evidencia_path');
            $table->decimal('geo_lng', 10, 7)->nullable()->after('geo_lat');
        });
    }

    public function down(): void
    {
        Schema::table('asistencias', function (Blueprint $table) {
            $table->dropColumn(['geo_lat', 'geo_lng']);
        });
        Schema::dropIfExists('modos_examen');
    }
};
