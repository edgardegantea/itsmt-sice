<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planeaciones_docentes', function (Blueprint $table) {
            $table->text('competencia_asignatura')->nullable()->after('intencion_didactica');
        });
    }

    public function down(): void
    {
        Schema::table('planeaciones_docentes', function (Blueprint $table) {
            $table->dropColumn('competencia_asignatura');
        });
    }
};
