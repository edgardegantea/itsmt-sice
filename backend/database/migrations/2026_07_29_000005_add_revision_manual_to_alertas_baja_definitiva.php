<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alertas_baja_definitiva', function (Blueprint $table) {
            // Referencia directa a la calificación que originó la alerta, para poder
            // deduplicar cuando no hay carga_academica_id (dato histórico) sin
            // depender solo de logs de servidor.
            $table->foreignUuid('calificacion_id')->nullable()->after('carga_academica_id')
                ->constrained('calificaciones')->nullOnDelete();
            // Marca los casos en que no se pudo determinar de forma inequívoca la
            // materia/carga académica (datos históricos) y requieren revisión manual
            // en vez de clasificación automática.
            $table->boolean('requiere_revision_manual')->default(false)->after('intento_numero');
        });
    }

    public function down(): void
    {
        Schema::table('alertas_baja_definitiva', function (Blueprint $table) {
            $table->dropColumn('requiere_revision_manual');
            $table->dropConstrainedForeignId('calificacion_id');
        });
    }
};
