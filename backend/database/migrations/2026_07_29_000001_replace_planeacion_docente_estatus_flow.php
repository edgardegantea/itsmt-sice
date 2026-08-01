<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reemplaza el flujo de un solo paso (borrador/entregada/revisada/liberada/devuelta)
 * por la cadena de aprobación de 3 actores pedida: Docente -> Desarrollo Académico ->
 * Jefatura de Carrera -> liberada, con devolución a Docente en cualquiera de los dos
 * pasos de revisión.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('planeaciones_docentes')->where('estatus', 'entregada')->update(['estatus' => 'enviada_da']);
        DB::table('planeaciones_docentes')->where('estatus', 'revisada')->update(['estatus' => 'enviada_jc']);
        DB::table('planeaciones_docentes')->where('estatus', 'devuelta')->update(['estatus' => 'devuelta_da']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE planeaciones_docentes DROP CONSTRAINT planeaciones_docentes_estatus_check');
            DB::statement("ALTER TABLE planeaciones_docentes ADD CONSTRAINT planeaciones_docentes_estatus_check CHECK (estatus IN ('borrador','enviada_da','devuelta_da','enviada_jc','devuelta_jc','liberada'))");
        } else {
            // SQLite emula el enum original como un CHECK inline en la propia
            // columna (no es cierto que no lo aplique, como asumía la versión
            // anterior de este comentario) — hay que reemplazar la columna para
            // que acepte los nuevos valores del flujo de 3 pasos.
            Schema::table('planeaciones_docentes', function (Blueprint $table) {
                $table->string('estatus')->default('borrador')->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE planeaciones_docentes DROP CONSTRAINT planeaciones_docentes_estatus_check');
            DB::statement("ALTER TABLE planeaciones_docentes ADD CONSTRAINT planeaciones_docentes_estatus_check CHECK (estatus IN ('borrador','entregada','revisada','liberada','devuelta'))");
        }

        DB::table('planeaciones_docentes')->where('estatus', 'enviada_da')->update(['estatus' => 'entregada']);
        DB::table('planeaciones_docentes')->where('estatus', 'enviada_jc')->update(['estatus' => 'revisada']);
        DB::table('planeaciones_docentes')->whereIn('estatus', ['devuelta_da', 'devuelta_jc'])->update(['estatus' => 'devuelta']);
    }
};
