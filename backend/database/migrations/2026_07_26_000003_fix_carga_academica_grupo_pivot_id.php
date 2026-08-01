<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

// La tabla pivote carga_academica_grupo se creó con `id` uuid sin default —
// attach()/sync() de Eloquent hacen un insert crudo que no dispara HasUuids,
// así que el id quedaba NULL (NOT NULL violation). Nada referencia esta pk
// desde fuera, así que se recrea con autoincrement, que es lo estándar para
// una tabla pivote simple.
return new class extends Migration
{
    public function up(): void
    {
        $filas = DB::table('carga_academica_grupo')->get(['carga_academica_id', 'grupo_id', 'created_at', 'updated_at']);

        Schema::dropIfExists('carga_academica_grupo');

        Schema::create('carga_academica_grupo', function (Blueprint $table) {
            $table->id();
            $table->uuid('carga_academica_id');
            $table->foreign('carga_academica_id')->references('id')->on('cargas_academicas')->cascadeOnDelete();
            $table->uuid('grupo_id');
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['carga_academica_id', 'grupo_id']);
        });

        foreach ($filas as $fila) {
            DB::table('carga_academica_grupo')->insert([
                'carga_academica_id' => $fila->carga_academica_id,
                'grupo_id'           => $fila->grupo_id,
                'created_at'         => $fila->created_at,
                'updated_at'         => $fila->updated_at,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('carga_academica_grupo', function (Blueprint $table) {
            //
        });
    }
};
