<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planeaciones_docentes', function (Blueprint $table) {
            // Observaciones ancladas a una sección/unidad/categoría específica de la
            // instrumentación (p. ej. "Unidad 2 — Fuentes de información"), a diferencia de
            // `observaciones_revision` que es el comentario general de la revisión.
            $table->json('observaciones_campos')->nullable()->after('observaciones_revision');
        });
    }

    public function down(): void
    {
        Schema::table('planeaciones_docentes', function (Blueprint $table) {
            $table->dropColumn('observaciones_campos');
        });
    }
};
