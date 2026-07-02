<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fichas_sindicales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('docente_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('clave_plaza')->unique();
            $table->enum('tipo_nombramiento', ['Base', 'Interino', 'Hora-Clase', 'Medio-Tiempo']);
            $table->string('categoria_tbc')->nullable();
            $table->string('nivel_tbc')->nullable();
            $table->string('numero_issste')->unique()->nullable();
            $table->date('fecha_ingreso_sep');
            $table->date('fecha_ingreso_tecnm')->nullable();
            $table->integer('anios_servicio')->default(0);
            $table->foreignUuid('departamento_id')->nullable()
                  ->constrained('directorio_areas')->nullOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('movimientos_plaza', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ficha_sindical_id')
                  ->constrained('fichas_sindicales')->cascadeOnDelete();
            $table->enum('tipo_movimiento', ['alta', 'cambio_categoria', 'baja', 'reingreso']);
            $table->string('categoria_anterior')->nullable();
            $table->string('categoria_nueva')->nullable();
            $table->date('fecha_efectiva');
            $table->string('documento_soporte_url')->nullable();
            $table->foreignUuid('registrado_por')->constrained('users')->cascadeOnDelete();
            $table->text('notas')->nullable();
            $table->timestamps();
            // NO soft deletes — historial inmutable
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_plaza');
        Schema::dropIfExists('fichas_sindicales');
    }
};
