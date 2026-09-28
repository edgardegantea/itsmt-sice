<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Evidencia fotográfica opcional del check-in QR — NO es reconocimiento
        // facial ni biometría (no se compara contra nada, no hay matching): es solo
        // una foto que queda adjunta al registro, disuasoria contra que alguien pase
        // lista por otro compañero, y consultable si hay una disputa de asistencia.
        Schema::table('asistencias', function (Blueprint $table) {
            $table->string('foto_evidencia_path')->nullable()->after('observacion');
        });
    }

    public function down(): void
    {
        Schema::table('asistencias', function (Blueprint $table) {
            $table->dropColumn('foto_evidencia_path');
        });
    }
};
