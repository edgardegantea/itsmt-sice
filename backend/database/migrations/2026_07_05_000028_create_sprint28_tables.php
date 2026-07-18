<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 28 — Portal del Egresado (ampliación)
        Schema::create('historial_laboral_egresados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('egresado_id')->constrained('egresados')->cascadeOnDelete();
            $table->string('empresa');
            $table->string('puesto');
            $table->string('sector')->nullable(); // publico/privado/emprendimiento/otro
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->string('rango_salarial')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('encuestas_seguimiento_egresados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('egresado_id')->constrained('egresados')->cascadeOnDelete();
            $table->string('periodo_aplicacion');
            $table->unsignedTinyInteger('satisfaccion_formacion')->nullable();
            $table->unsignedTinyInteger('pertinencia_plan_estudios')->nullable();
            $table->unsignedSmallInteger('empleabilidad_meses')->nullable();
            $table->boolean('recomendaria')->nullable();
            $table->text('comentarios')->nullable();
            $table->string('estatus')->default('pendiente'); // pendiente/respondida
            $table->timestamp('fecha_respuesta')->nullable();
            $table->timestamps();
        });

        Schema::create('vacantes_bolsa_trabajo', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('empresa');
            $table->string('puesto');
            $table->text('descripcion')->nullable();
            $table->foreignUuid('carrera_id')->nullable()->constrained('carreras');
            $table->string('rango_salarial')->nullable();
            $table->string('modalidad')->default('presencial'); // presencial/remoto/hibrido
            $table->string('contacto_email');
            $table->date('fecha_publicacion');
            $table->date('fecha_cierre')->nullable();
            $table->boolean('activa')->default(true);
            $table->foreignUuid('publicado_por')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('postulaciones_bolsa_trabajo', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vacante_id')->constrained('vacantes_bolsa_trabajo')->cascadeOnDelete();
            $table->foreignUuid('egresado_id')->constrained('egresados')->cascadeOnDelete();
            $table->date('fecha_postulacion');
            $table->string('estatus')->default('postulado'); // postulado/en_proceso/contratado/rechazado
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulaciones_bolsa_trabajo');
        Schema::dropIfExists('vacantes_bolsa_trabajo');
        Schema::dropIfExists('encuestas_seguimiento_egresados');
        Schema::dropIfExists('historial_laboral_egresados');
    }
};
