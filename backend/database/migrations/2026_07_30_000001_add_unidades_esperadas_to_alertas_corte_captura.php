<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alertas_corte_captura', function (Blueprint $table) {
            $table->unsignedTinyInteger('total_unidades_temario')->nullable()->after('porcentaje_capturado');
            $table->unsignedTinyInteger('unidades_esperadas')->nullable()->after('total_unidades_temario');
        });
    }

    public function down(): void
    {
        Schema::table('alertas_corte_captura', function (Blueprint $table) {
            $table->dropColumn(['total_unidades_temario', 'unidades_esperadas']);
        });
    }
};
