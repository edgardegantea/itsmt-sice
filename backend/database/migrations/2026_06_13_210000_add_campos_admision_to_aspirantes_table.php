<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->string('area_bachillerato', 60)->nullable()->after('escuela_bachillerato');
            $table->string('estado_civil', 30)->nullable()->after('sexo');
            $table->string('medio_enterado', 80)->nullable()->after('documentos');
            $table->boolean('tiene_equipo_computo')->nullable()->after('medio_enterado');
            $table->string('campus_preferido', 40)->nullable()->after('carrera_id');
            $table->string('modalidad_preferida', 20)->nullable()->after('campus_preferido');
            $table->string('constancia_bachillerato', 255)->nullable()->after('modalidad_preferida');
        });
    }

    public function down(): void
    {
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropColumn([
                'area_bachillerato', 'estado_civil', 'medio_enterado',
                'tiene_equipo_computo', 'campus_preferido', 'modalidad_preferida',
                'constancia_bachillerato',
            ]);
        });
    }
};
