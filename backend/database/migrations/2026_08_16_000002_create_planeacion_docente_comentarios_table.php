<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planeacion_docente_comentarios', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('planeacion_docente_id')->constrained('planeaciones_docentes')->cascadeOnDelete();
            $table->foreignUuid('autor_id')->nullable()->constrained('users')->nullOnDelete();
            // Misma anclada de sección/unidad/categoría que ya usa observaciones_campos, para
            // reutilizar los mismos puntos de anclaje del editor y de la vista de revisión.
            $table->string('seccion');
            $table->unsignedInteger('unidad')->nullable();
            $table->string('categoria')->nullable();
            $table->text('mensaje');
            // Denormalizado a propósito: se actualiza en todas las filas del mismo hilo
            // (mismo seccion+unidad+categoria) al resolver, para no necesitar una tabla aparte
            // solo para el estado del hilo.
            $table->boolean('resuelto')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['planeacion_docente_id', 'seccion', 'unidad', 'categoria']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planeacion_docente_comentarios');
    }
};
