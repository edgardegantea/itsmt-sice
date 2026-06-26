<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->string('satca', 20)->nullable()->after('clave_oficial_tecnm');
            $table->text('caracterizacion')->nullable()->after('satca');
            $table->text('intencion_didactica')->nullable()->after('caracterizacion');
            $table->text('competencia_especifica')->nullable()->after('intencion_didactica');
            $table->text('competencias_previas')->nullable()->after('competencia_especifica');
            $table->jsonb('temario')->nullable()->after('competencias_previas');
            $table->jsonb('fuentes_informacion')->nullable()->after('temario');
            $table->string('documento_path', 500)->nullable()->after('fuentes_informacion');
        });
    }

    public function down(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->dropColumn([
                'satca', 'caracterizacion', 'intencion_didactica',
                'competencia_especifica', 'competencias_previas',
                'temario', 'fuentes_informacion', 'documento_path',
            ]);
        });
    }
};
