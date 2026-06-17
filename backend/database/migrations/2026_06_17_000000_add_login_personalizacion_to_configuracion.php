<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->string('login_titulo', 150)->nullable()->after('fecha_fin_actualizacion_datos');
            $table->string('login_subtitulo', 250)->nullable()->after('login_titulo');
            $table->string('login_imagen_fondo')->nullable()->after('login_subtitulo');
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->dropColumn(['login_titulo', 'login_subtitulo', 'login_imagen_fondo']);
        });
    }
};
