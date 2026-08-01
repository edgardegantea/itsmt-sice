<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sesiones_clase', function (Blueprint $table) {
            // Código corto que el docente genera y muestra como QR para que los alumnos
            // se autorregistren como presentes escaneándolo desde su propio dispositivo.
            $table->string('codigo_checkin', 8)->nullable()->after('tema');
            $table->timestamp('checkin_expira_en')->nullable()->after('codigo_checkin');
        });
    }

    public function down(): void
    {
        Schema::table('sesiones_clase', function (Blueprint $table) {
            $table->dropColumn(['codigo_checkin', 'checkin_expira_en']);
        });
    }
};
