<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sin soft delete según documento
        Schema::create('convenios_movilidad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre_institucion');
            $table->enum('tipo', ['tecnm', 'nacional', 'extranjera']);
            $table->date('vigente_desde');
            $table->date('vigente_hasta')->nullable();
            $table->string('url_convenio')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('movilidad_estudiantil', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('convenio_id')->nullable()->constrained('convenios_movilidad')->nullOnDelete();
            $table->string('ies_receptora');
            $table->unsignedInteger('semestres_acumulados_movilidad')->default(0);
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->json('materias_cursadas')->nullable(); // [{nombre, calificacion, tipo_acreditacion: numerica|AC|NA}]
            $table->enum('estatus', ['activa', 'concluida', 'cancelada'])->default('activa');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('cursos_verano', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('periodo_padre_id')->constrained('periodos')->cascadeOnDelete();
            $table->foreignUuid('materia_id')->constrained('materias')->cascadeOnDelete();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('aula_id')->nullable()->constrained('aulas')->nullOnDelete();
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->unsignedInteger('max_alumnos')->default(30);
            $table->unsignedInteger('min_alumnos')->default(15);
            $table->enum('estatus', ['programado', 'activo', 'cerrado', 'cancelado'])->default('programado');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('inscripciones_verano', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('curso_verano_id')->constrained('cursos_verano')->cascadeOnDelete();
            $table->decimal('calificacion', 5, 2)->nullable();
            $table->boolean('acreditado')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['alumno_id', 'curso_verano_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscripciones_verano');
        Schema::dropIfExists('cursos_verano');
        Schema::dropIfExists('movilidad_estudiantil');
        Schema::dropIfExists('convenios_movilidad');
    }
};
