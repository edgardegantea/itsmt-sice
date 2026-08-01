<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Inserta el paso de revisión de Desarrollo Académico entre "enviada" (docente) y
 * "liberada" (jefe de carrera): borrador -> enviada -> [observaciones|enviada_jc] ->
 * liberada -> vigente. También agrega observaciones_campos (anotaciones por sección,
 * mismo patrón JSON que planeaciones_docentes) para no limitar la retroalimentación a
 * un único comentario global en observaciones_jefe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('instrumentaciones_didacticas', function (Blueprint $table) {
            $table->json('observaciones_campos')->nullable()->after('observaciones_jefe');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE instrumentaciones_didacticas DROP CONSTRAINT instrumentaciones_didacticas_estatus_check');
            DB::statement("ALTER TABLE instrumentaciones_didacticas ADD CONSTRAINT instrumentaciones_didacticas_estatus_check CHECK (estatus IN ('borrador','enviada','observaciones','enviada_jc','liberada','vigente'))");
        } else {
            Schema::table('instrumentaciones_didacticas', function (Blueprint $table) {
                $table->string('estatus')->default('borrador')->change();
            });
        }
    }

    public function down(): void
    {
        DB::table('instrumentaciones_didacticas')->where('estatus', 'enviada_jc')->update(['estatus' => 'enviada']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE instrumentaciones_didacticas DROP CONSTRAINT instrumentaciones_didacticas_estatus_check');
            DB::statement("ALTER TABLE instrumentaciones_didacticas ADD CONSTRAINT instrumentaciones_didacticas_estatus_check CHECK (estatus IN ('borrador','enviada','observaciones','liberada','vigente'))");
        }

        Schema::table('instrumentaciones_didacticas', function (Blueprint $table) {
            $table->dropColumn('observaciones_campos');
        });
    }
};
