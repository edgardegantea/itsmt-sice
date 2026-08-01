<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// grupo_id ya fue migrado a la tabla pivote carga_academica_grupo (ver
// 2026_07_26_000000_add_carga_academica_grupo_pivot) y la aplicación ya no lo
// lee ni lo escribe — se elimina la columna por completo en vez de solo
// relajar el NOT NULL, así funciona igual en sqlite (tests) y Postgres sin
// depender de doctrine/dbal (dropColumn/dropForeign no lo requieren).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cargas_academicas', function (Blueprint $table) {
            $table->dropForeign(['grupo_id']);
            $table->dropColumn('grupo_id');
        });
    }

    public function down(): void
    {
        Schema::table('cargas_academicas', function (Blueprint $table) {
            $table->uuid('grupo_id')->nullable()->after('materia_id');
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
        });
    }
};
