<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── clave_oficial_tecnm en materias ───────────────────────────────────
        Schema::table('materias', function (Blueprint $table) {
            $table->string('clave_oficial_tecnm', 20)->nullable()->after('clave');
        });

        // ── Mallas curriculares ───────────────────────────────────────────────
        // Permite asignar la misma materia a distintas carreras/semestres
        Schema::create('mallas_curriculares', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('carrera_id')->constrained('carreras')->cascadeOnDelete();
            $table->foreignUuid('materia_id')->constrained('materias')->cascadeOnDelete();
            $table->unsignedTinyInteger('semestre');
            $table->boolean('es_especialidad')->default(false);
            $table->timestamps();
            $table->unique(['carrera_id', 'materia_id', 'semestre']);
        });

        // ── Aulas ─────────────────────────────────────────────────────────────
        Schema::create('aulas', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->string('nombre', 50);
            $table->unsignedSmallInteger('capacidad')->default(35);
            $table->enum('tipo', ['salon', 'laboratorio', 'taller'])->default('salon');
            $table->boolean('activa')->default(true);
            $table->timestamps();
        });

        // ── aula_id en cargas_academicas ──────────────────────────────────────
        Schema::table('cargas_academicas', function (Blueprint $table) {
            $table->foreignUuid('aula_id')->nullable()->constrained('aulas')->nullOnDelete()->after('periodo_id');
        });

        // ── Horarios (bloques por carga académica) ────────────────────────────
        Schema::create('horarios', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('carga_academica_id')->constrained('cargas_academicas')->cascadeOnDelete();
            $table->enum('dia_semana', ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']);
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->timestamps();
        });

        // ── Planeaciones didácticas ────────────────────────────────────────────
        Schema::create('planeaciones_docentes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('carga_academica_id')->constrained('cargas_academicas')->cascadeOnDelete();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->string('archivo_url')->nullable();
            $table->enum('estatus', ['borrador', 'entregada', 'revisada', 'liberada', 'devuelta'])->default('borrador');
            $table->text('caracterizacion')->nullable();
            $table->text('intencion_didactica')->nullable();
            $table->json('competencias')->nullable();        // array de competencias con temas, actividades, indicadores
            $table->text('fuentes_informacion')->nullable();
            $table->text('apoyos_didacticos')->nullable();
            $table->json('calendarizacion')->nullable();     // 16 semanas: {semana, tp, tr, sd, tipo}
            $table->date('fecha_entrega')->nullable();       // ≥3 días hábiles antes del inicio (PO-003 §3.4)
            $table->text('observaciones_revision')->nullable();
            $table->foreignUuid('revisado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revisado_en')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['carga_academica_id', 'periodo_id']);
        });

        // ── Horarios de trabajo docente (TecNM-AC-PO-003-01) ─────────────────
        Schema::create('horarios_trabajo', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->json('carga_academica_json')->nullable();   // grupos asignados con asignatura, aula, nivel, horario
            $table->json('apoyo_docencia_json')->nullable();    // actividades tipo I-VII con metas y horario
            $table->json('actividades_admin_json')->nullable();
            $table->unsignedSmallInteger('total_horas_semanales')->default(0);
            $table->string('cct_docente', 20)->nullable();
            $table->string('tipo_nombramiento', 80)->nullable();
            $table->date('fecha_ingreso_sep')->nullable();
            $table->string('url_pdf')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['docente_id', 'periodo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horarios_trabajo');
        Schema::dropIfExists('planeaciones_docentes');
        Schema::dropIfExists('horarios');
        Schema::table('cargas_academicas', fn($t) => $t->dropForeignIdFor(\App\Domains\Academico\Models\Aula::class, 'aula_id'));
        Schema::dropIfExists('aulas');
        Schema::dropIfExists('mallas_curriculares');
        Schema::table('materias', fn($t) => $t->dropColumn('clave_oficial_tecnm'));
    }
};
