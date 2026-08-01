<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calificaciones', function (Blueprint $table) {
            // S4-04: al cerrar el curso, las calificaciones se marcan como publicadas
            // (ya no editables por el docente).
            $table->boolean('publicada')->default(false)->after('oportunidad');
            // S4-07: al firmar el acta se refleja en el kardex del alumno.
            $table->boolean('kardex_actualizado')->default(false)->after('publicada');
        });
    }

    public function down(): void
    {
        Schema::table('calificaciones', function (Blueprint $table) {
            $table->dropColumn(['publicada', 'kardex_actualizado']);
        });
    }
};
