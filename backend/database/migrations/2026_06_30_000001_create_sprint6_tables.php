<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Servicio Social — S6-01/S6-02
        Schema::create('servicio_social', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->string('empresa', 200);
            $table->string('responsable', 150)->nullable();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->enum('estatus', ['solicitado', 'aprobado', 'rechazado', 'en_curso', 'acreditado'])->default('solicitado');
            $table->unsignedSmallInteger('horas_acumuladas')->default(0);
            $table->enum('nivel_desempeno', ['excelente', 'notable', 'bueno', 'suficiente', 'insuficiente'])->nullable();
            $table->unsignedTinyInteger('creditos_otorgados')->default(0);
            $table->json('documentos')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Solicitudes de Residencia Profesional — S6-06
        Schema::create('solicitudes_rp', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->enum('opcion', ['banco_proyectos', 'propuesta_propia', 'trabajador']);
            $table->json('datos_empresa')->nullable();
            $table->string('numero_seguro_social', 20)->nullable();
            $table->enum('tipo_seguro', ['imss', 'issste'])->nullable();
            $table->string('periodo_proyectado', 20)->nullable();
            $table->enum('estatus', [
                'pendiente_dictamen',
                'con_dictamen_aceptado',
                'con_dictamen_rechazado',
            ])->default('pendiente_dictamen');
            $table->timestamps();
            $table->softDeletes();
        });

        // Dictámenes de Anteproyecto — S6-07 (no soft delete per plan)
        Schema::create('dictamenes_anteproyecto', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('solicitud_rp_id')->constrained('solicitudes_rp');
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->text('anteproyecto')->nullable();
            $table->string('empresa', 200)->nullable();
            $table->foreignUuid('asesor_interno_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('asesor_externo', 150)->nullable();
            $table->enum('dictamen', ['aceptado', 'rechazado']);
            $table->date('fecha_dictamen');
            $table->string('url_pdf')->nullable();
            $table->foreignUuid('presidente_academia_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('jefe_depto_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('subdirector_academico_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Residencias Profesionales — S6-04
        Schema::create('residencias_profesionales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('solicitud_rp_id')->constrained('solicitudes_rp');
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->foreignUuid('asesor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('empresa', 200)->nullable();
            $table->string('proyecto', 300)->nullable();
            $table->enum('estatus', ['asignado', 'en_curso', 'en_evaluacion', 'acreditado', 'no_acreditado'])->default('asignado');
            $table->unsignedTinyInteger('etapa_actual')->default(1);
            $table->unsignedSmallInteger('horas_acumuladas')->default(0);
            $table->decimal('calificacion_seguimiento_1', 5, 2)->nullable();
            $table->decimal('calificacion_seguimiento_2', 5, 2)->nullable();
            $table->decimal('calificacion_reporte_final', 5, 2)->nullable();
            $table->decimal('calificacion_final', 5, 2)->nullable();
            $table->boolean('carta_presentacion_generada')->default(false);
            $table->string('url_oficio_asesor')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Asesorías RP — S6-09 (deferred pero tabla necesaria)
        Schema::create('asesorias_rp', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('residencia_id')->constrained('residencias_profesionales')->cascadeOnDelete();
            $table->foreignUuid('asesor_interno_id')->constrained('users');
            $table->date('fecha');
            $table->string('lugar', 150)->nullable();
            $table->unsignedTinyInteger('num_asesoria')->default(1);
            $table->string('tipo', 50)->nullable();
            $table->json('temas')->nullable();
            $table->text('solucion_recomendada')->nullable();
            $table->boolean('firmada')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        // Evaluaciones RP — S6-11 (deferred pero tabla necesaria)
        Schema::create('evaluaciones_rp', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('residencia_id')->constrained('residencias_profesionales')->cascadeOnDelete();
            $table->enum('tipo', ['seguimiento_1', 'seguimiento_2', 'reporte_final']);
            $table->enum('evaluador_tipo', ['interno', 'externo']);
            $table->json('criterios')->nullable();
            $table->decimal('calificacion', 5, 2)->nullable();
            $table->date('fecha_evaluacion');
            $table->timestamps();
            $table->softDeletes();
        });

        // Documentos Normativos — polimórfico
        Schema::create('documentos_normativos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entidad_type', 100);
            $table->uuid('entidad_id');
            $table->string('tipo_documento', 100);
            $table->string('url_archivo');
            $table->boolean('validado')->default(false);
            $table->foreignUuid('validado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['entidad_type', 'entidad_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_normativos');
        Schema::dropIfExists('evaluaciones_rp');
        Schema::dropIfExists('asesorias_rp');
        Schema::dropIfExists('residencias_profesionales');
        Schema::dropIfExists('dictamenes_anteproyecto');
        Schema::dropIfExists('solicitudes_rp');
        Schema::dropIfExists('servicio_social');
    }
};
