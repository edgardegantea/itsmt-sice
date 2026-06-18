<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->string('color_acento', 7)->default('#f59e0b')->after('color_secundario');
            $table->string('color_sidebar', 7)->nullable()->after('color_acento');
            $table->string('radio_bordes', 20)->default('redondeado')->after('color_sidebar'); // cuadrado | moderado | redondeado | pill
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->dropColumn(['color_acento', 'color_sidebar', 'radio_bordes']);
        });
    }
};
