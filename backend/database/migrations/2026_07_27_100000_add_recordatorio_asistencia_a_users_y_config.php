<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // null = el docente hereda la configuración global; true/false = el
        // superadmin fijó una excepción explícita para este docente.
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('recordatorio_asistencia_activo')->nullable()->default(null);
        });

        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->boolean('recordatorios_asistencia_global_activo')->default(true);
        });

        Schema::create('recordatorios_asistencia_enviados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('horario_id')->constrained('horarios')->cascadeOnDelete();
            $table->date('fecha');
            $table->timestamps();

            $table->unique(['horario_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recordatorios_asistencia_enviados');

        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->dropColumn('recordatorios_asistencia_global_activo');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('recordatorio_asistencia_activo');
        });
    }
};
