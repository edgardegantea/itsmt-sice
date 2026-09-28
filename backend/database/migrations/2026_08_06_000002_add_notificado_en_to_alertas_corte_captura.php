<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Marca cuándo se le avisó por correo al docente de esta alerta pendiente,
        // para no reenviar el mismo recordatorio cada vez que corre el comando
        // programado (a diferencia de leida_docente, que el docente controla al
        // abrir la alerta en la app).
        Schema::table('alertas_corte_captura', function (Blueprint $table) {
            $table->timestamp('notificado_en')->nullable()->after('leida_director');
        });
    }

    public function down(): void
    {
        Schema::table('alertas_corte_captura', function (Blueprint $table) {
            $table->dropColumn('notificado_en');
        });
    }
};
