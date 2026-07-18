<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sprint 27 — Infraestructura y Recursos
        Schema::create('inventario', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('clave')->unique();
            $table->string('nombre');
            $table->string('categoria')->default('otro'); // mobiliario/equipo_computo/laboratorio/audiovisual/otro
            $table->text('descripcion')->nullable();
            $table->foreignUuid('aula_id')->nullable()->constrained('aulas');
            $table->string('estado')->default('activo'); // activo/mantenimiento/baja
            $table->date('fecha_adquisicion')->nullable();
            $table->decimal('valor', 12, 2)->nullable();
            $table->foreignUuid('responsable_id')->nullable()->constrained('users');
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('prestamos_equipo', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inventario_id')->constrained('inventario');
            $table->foreignUuid('solicitante_id')->constrained('users');
            $table->date('fecha_prestamo');
            $table->date('fecha_devolucion_prevista');
            $table->date('fecha_devolucion_real')->nullable();
            $table->string('estatus')->default('prestado'); // prestado/devuelto/vencido/dañado
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('reservas_espacios', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aula_id')->constrained('aulas');
            $table->foreignUuid('solicitante_id')->constrained('users');
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->string('motivo');
            $table->string('estatus')->default('pendiente'); // pendiente/aprobada/rechazada/cancelada
            $table->foreignUuid('aprobado_por')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('solicitudes_mantenimiento', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inventario_id')->nullable()->constrained('inventario');
            $table->foreignUuid('aula_id')->nullable()->constrained('aulas');
            $table->foreignUuid('reportado_por')->constrained('users');
            $table->string('tipo')->default('correctivo'); // correctivo/preventivo
            $table->text('descripcion');
            $table->string('prioridad')->default('media'); // baja/media/alta/urgente
            $table->string('estatus')->default('abierta'); // abierta/en_proceso/resuelta/cancelada
            $table->date('fecha_reporte');
            $table->date('fecha_resolucion')->nullable();
            $table->foreignUuid('atendido_por')->nullable()->constrained('users');
            $table->text('notas_resolucion')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_mantenimiento');
        Schema::dropIfExists('reservas_espacios');
        Schema::dropIfExists('prestamos_equipo');
        Schema::dropIfExists('inventario');
    }
};
