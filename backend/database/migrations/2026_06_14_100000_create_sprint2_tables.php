<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── adeudos ──────────────────────────────────────────────────────────
        Schema::create('adeudos', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('alumno_id')->constrained('alumnos')->cascadeOnDelete();
            $table->string('concepto');
            $table->decimal('monto', 8, 2);
            $table->boolean('pagado')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        // ── orden_reinscripcion ───────────────────────────────────────────────
        Schema::create('orden_reinscripcion', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->foreignUuid('carrera_id')->constrained('carreras');
            $table->smallInteger('semestre');
            $table->date('fecha_inicio_reinscripcion');
            $table->date('fecha_fin_reinscripcion');
            $table->boolean('publicado')->default(false);
            $table->foreignUuid('publicado_por')->nullable()->constrained('users');
            $table->timestamp('publicado_en')->nullable();
            $table->timestamps();

            $table->unique(['periodo_id', 'carrera_id', 'semestre']);
        });

        // ── reinscripciones ───────────────────────────────────────────────────
        Schema::create('reinscripciones', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->enum('estatus', ['pendiente', 'aprobada', 'rechazada'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->foreignUuid('aprobado_por')->nullable()->constrained('users');
            $table->timestamp('aprobado_en')->nullable();
            $table->foreignUuid('recibo_cobro_id')->nullable()->constrained('recibos_cobro');
            $table->boolean('resello_registrado')->default(false);
            $table->date('fecha_resello')->nullable();
            $table->foreignUuid('resello_por')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['alumno_id', 'periodo_id']);
        });

        // ── bajas ─────────────────────────────────────────────────────────────
        Schema::create('bajas', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->foreignUuid('periodo_id')->constrained('periodos');
            $table->enum('tipo_baja', ['parcial', 'temporal', 'definitiva']);
            $table->string('motivo_enum')->nullable();
            $table->text('motivo_texto')->nullable();
            $table->date('fecha_solicitud');
            $table->date('fecha_efectiva')->nullable();
            $table->foreignUuid('registrada_por')->constrained('users');
            $table->integer('numero_semestres_cursados')->nullable();
            $table->boolean('reingreso_posible')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // ── constancias ───────────────────────────────────────────────────────
        Schema::create('constancias', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->foreignUuid('alumno_id')->constrained('alumnos');
            $table->enum('tipo', ['estudios', 'inscripcion', 'calificaciones']);
            $table->string('folio_unico')->unique();
            $table->string('url_pdf')->nullable();
            $table->enum('estatus', ['solicitada', 'emitida'])->default('solicitada');
            $table->foreignUuid('solicitada_por')->constrained('users');
            $table->foreignUuid('emitida_por')->nullable()->constrained('users');
            $table->timestamp('emitida_en')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('constancias');
        Schema::dropIfExists('bajas');
        Schema::dropIfExists('reinscripciones');
        Schema::dropIfExists('orden_reinscripcion');
        Schema::dropIfExists('adeudos');
    }
};
