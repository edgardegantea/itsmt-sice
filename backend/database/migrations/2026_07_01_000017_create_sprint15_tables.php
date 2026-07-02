<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('traslados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->enum('tipo', ['entrada', 'salida']);
            $table->string('instituto_origen')->nullable();
            $table->string('instituto_destino')->nullable();
            $table->date('fecha_solicitud');
            $table->enum('estatus', ['solicitado', 'aceptado', 'rechazado'])->default('solicitado');
            $table->string('constancia_no_inconveniencia_url')->nullable();
            $table->string('kardex_url')->nullable();
            $table->text('motivo_rechazo')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('convalidaciones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->string('materia_origen_nombre');
            $table->string('materia_origen_clave');
            $table->decimal('calificacion_obtenida', 5, 2);
            $table->string('institucion_origen');
            $table->foreignUuid('materia_equivalente_id')->nullable()->constrained('materias')->nullOnDelete();
            $table->string('dictamen_url')->nullable();
            $table->foreignUuid('registrado_por')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('equivalencias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('alumno_id')->constrained('users')->cascadeOnDelete();
            $table->string('institucion_origen');
            $table->json('materias_json'); // array: {clave, nombre, calificacion, creditos, materia_equivalente_id}
            $table->string('dictamen_url')->nullable();
            $table->foreignUuid('validado_por')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equivalencias');
        Schema::dropIfExists('convalidaciones');
        Schema::dropIfExists('traslados');
    }
};
