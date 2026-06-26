<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->jsonb('actividades_aprendizaje')->nullable()->after('temario');
            $table->jsonb('practicas')->nullable()->after('actividades_aprendizaje');
            $table->text('proyecto_asignatura')->nullable()->after('practicas');
            $table->text('evaluacion')->nullable()->after('proyecto_asignatura');
        });
    }

    public function down(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->dropColumn(['actividades_aprendizaje', 'practicas', 'proyecto_asignatura', 'evaluacion']);
        });
    }
};
