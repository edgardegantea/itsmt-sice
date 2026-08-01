<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carga_academica_grupo', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('carga_academica_id');
            $table->foreign('carga_academica_id')->references('id')->on('cargas_academicas')->cascadeOnDelete();
            $table->uuid('grupo_id');
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['carga_academica_id', 'grupo_id']);
        });

        // Migra los datos existentes: una clase por grupo único pasa a ser
        // una fila del pivote (relación N:N desde ahora).
        DB::table('cargas_academicas')
            ->whereNotNull('grupo_id')
            ->orderBy('id')
            ->select('id', 'grupo_id')
            ->cursor()
            ->each(function ($carga) {
                DB::table('carga_academica_grupo')->insert([
                    'id'                  => (string) Str::uuid(),
                    'carga_academica_id'  => $carga->id,
                    'grupo_id'            => $carga->grupo_id,
                    'created_at'          => now(),
                    'updated_at'          => now(),
                ]);
            });

        // La unicidad docente+materia+grupo+periodo ya no aplica: una carga
        // ahora puede tener varios grupos, y la unicidad real por bloque de
        // horario vive en `horarios` (día/hora) + las constraints EXCLUDE.
        Schema::table('cargas_academicas', function (Blueprint $table) {
            $table->dropUnique(['docente_id', 'materia_id', 'grupo_id', 'periodo_id']);
        });

        // grupo_id queda nullable sin doctrine/dbal (no instalado): ALTER
        // directo en Postgres, mismo patrón que 2026_07_25_150000_widen_clave...
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE cargas_academicas ALTER COLUMN grupo_id DROP NOT NULL');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE cargas_academicas ALTER COLUMN grupo_id SET NOT NULL');
        }

        Schema::table('cargas_academicas', function (Blueprint $table) {
            $table->unique(['docente_id', 'materia_id', 'grupo_id', 'periodo_id']);
        });

        Schema::dropIfExists('carga_academica_grupo');
    }
};
