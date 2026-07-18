<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // El modelo Aula usa SoftDeletes y la migración del Sprint 11
        // (2026_07_01_000011) ya agrega la columna para instalaciones nuevas.
        // Pero esa migración fue editada DESPUÉS de haberse ejecutado ya en
        // algunos entornos (ej. dev), por lo que ahí la columna nunca se
        // llegó a crear — GET /aulas fallaba con
        // "column aulas.deleted_at does not exist". Esta migración es
        // idempotente: no hace nada si la columna ya existe (instalaciones
        // nuevas) y la agrega si falta (entornos con el drift descrito).
        if (! Schema::hasColumn('aulas', 'deleted_at')) {
            Schema::table('aulas', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        // No-op: esta migración no es dueña de la columna en instalaciones
        // nuevas (la crea el Sprint 11); revertirla ahí rompería ese esquema.
    }
};
