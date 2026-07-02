<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Modalidades de titulación — opciones I-X Manual TecNM (sin SoftDelete — catálogo estable)
        Schema::create('modalidades_titulacion', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre', 150);
            $table->unsignedTinyInteger('opcion_numero'); // 1-10
            $table->text('descripcion')->nullable();
            $table->boolean('requiere_examen')->default(true);  // false → constancia de exención
            $table->boolean('requiere_tesis')->default(false);
            $table->json('documentos_requeridos')->nullable();
            $table->timestamps();
        });

        // Certificados de lengua extranjera — S7-05
        Schema::create('certificados_idioma', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->string('idioma', 60)->default('Inglés');
            $table->string('nivel', 20)->default('B1');
            $table->string('institucion_certificadora', 200);
            $table->date('fecha_expedicion');
            $table->date('fecha_vencimiento')->nullable();
            $table->string('url_documento')->nullable();
            $table->boolean('validado')->default(false);
            $table->foreignUuid('validado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Solicitudes de Acto Protocolario — S7-03/S7-04 (PO-006-01)
        Schema::create('solicitudes_acto_protocolario', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->foreignUuid('modalidad_id')->constrained('modalidades_titulacion');
            $table->enum('estatus', [
                'pendiente_revision',
                'no_procede',
                'con_no_inconveniencia',
                'agendado',
                'aprobado',
                'reprobado',
                'exento',
            ])->default('pendiente_revision');
            $table->text('motivo_improcedencia')->nullable();
            $table->date('retake_plazo_hasta')->nullable(); // 3 meses si reprueba — política 3.2 PO-006
            $table->timestamps();
            $table->softDeletes();
        });

        // Constancias de No Inconveniencia — S7-04 (PO-006-02, sin SoftDelete — permanentes)
        Schema::create('constancias_no_inconveniencia', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('solicitud_id')->constrained('solicitudes_acto_protocolario')->cascadeOnDelete();
            $table->foreignUuid('emitida_por')->constrained('users');
            $table->string('url_pdf')->nullable();
            $table->date('fecha_emision');
            $table->timestamps();
        });

        // Actos Protocolarios — S7-04 (PO-006-03)
        Schema::create('actos_protocolarios', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('solicitud_id')->constrained('solicitudes_acto_protocolario')->cascadeOnDelete();
            $table->date('fecha');
            $table->time('hora');
            $table->string('lugar', 200);
            $table->json('sinodales_json')->nullable(); // [{usuario_id, nombre, rol_sinodal}]
            $table->timestamp('aviso_enviado_en')->nullable();
            $table->string('libro_actas_folio', 50)->nullable();
            $table->enum('resultado', ['pendiente', 'aprobado', 'reprobado'])->default('pendiente');
            $table->string('url_aviso_pdf')->nullable();      // PO-006-03
            $table->string('url_acta_pdf')->nullable();       // Acta Examen Profesional (permanente)
            $table->string('url_constancia_exencion_pdf')->nullable(); // Constancia Exención (permanente)
            $table->boolean('firmado_jefe_servicios')->default(false);
            $table->boolean('firmado_director')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        // Titulaciones — resumen del expediente de titulación
        Schema::create('titulaciones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->foreignUuid('modalidad_id')->constrained('modalidades_titulacion');
            $table->foreignUuid('acto_protocolario_id')->nullable()->constrained('actos_protocolarios')->nullOnDelete();
            $table->string('estatus', 30)->default('en_proceso'); // en_proceso|aprobado|reprobado|exento
            $table->string('etapa_actual', 50)->default('solicitud');
            $table->json('documentos')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Salida Lateral — S7-06/S7-07
        Schema::create('salida_lateral', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->foreignUuid('periodo_solicitud_id')->constrained('periodos');
            $table->decimal('porcentaje_creditos_al_solicitar', 5, 2);
            $table->foreignUuid('asignatura_especialidad_id')->constrained('materias');
            $table->enum('estatus', ['solicitado', 'en_revision', 'aprobado', 'rechazado'])->default('solicitado');
            $table->string('url_diploma')->nullable();
            $table->foreignUuid('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salida_lateral');
        Schema::dropIfExists('titulaciones');
        Schema::dropIfExists('actos_protocolarios');
        Schema::dropIfExists('constancias_no_inconveniencia');
        Schema::dropIfExists('solicitudes_acto_protocolario');
        Schema::dropIfExists('certificados_idioma');
        Schema::dropIfExists('modalidades_titulacion');
    }
};
