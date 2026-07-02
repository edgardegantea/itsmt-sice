<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permisos_sindicales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->enum('tipo_permiso', ['comision_sindical', 'licencia_con_goce', 'licencia_sin_goce']);
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->integer('dias_totales');
            $table->boolean('con_goce_sueldo')->default(true);
            $table->text('motivo');
            $table->boolean('oficio_generado')->default(false);
            $table->foreignUuid('autorizado_por')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->nullable()->constrained('periodos')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('concursos_oposicion', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre');
            $table->date('fecha_realizacion');
            $table->text('descripcion')->nullable();
            $table->foreignUuid('convocado_por')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('participantes_concurso', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('concurso_id')->constrained('concursos_oposicion')->cascadeOnDelete();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('puntaje_obtenido', 5, 2)->nullable();
            $table->enum('resultado', ['promovido', 'no_promovido', 'pendiente'])->default('pendiente');
            $table->foreignUuid('movimiento_plaza_id')->nullable()
                  ->constrained('movimientos_plaza')->nullOnDelete();
            $table->timestamps();
            $table->unique(['concurso_id', 'docente_id']);
            // NO soft deletes — registro inmutable de concurso
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participantes_concurso');
        Schema::dropIfExists('concursos_oposicion');
        Schema::dropIfExists('permisos_sindicales');
    }
};
