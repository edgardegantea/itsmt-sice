<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Bitácora de cada guardado de calificación (docente edita, se registra el
    // antes/después) — consultable solo por Desarrollo Académico, Jefatura de Carrera,
    // Control Escolar, Subdirección/Dirección Académica, Dirección General y superadmin.
    public function up(): void
    {
        Schema::create('calificaciones_historial', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('calificacion_id')->constrained('calificaciones')->cascadeOnDelete();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->foreignUuid('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->foreignUuid('carga_academica_id')->constrained('cargas_academicas')->cascadeOnDelete();
            $table->foreignUuid('editado_por')->constrained('users');
            $table->json('parciales_anteriores')->nullable();
            $table->json('parciales_nuevos')->nullable();
            $table->decimal('calificacion_final_anterior', 5, 2)->nullable();
            $table->decimal('calificacion_final_nueva', 5, 2)->nullable();
            $table->decimal('promedio_anterior', 5, 2)->nullable();
            $table->decimal('promedio_nuevo', 5, 2)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['grupo_id', 'carga_academica_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calificaciones_historial');
    }
};
