<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comunicados', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('titulo');
            $table->text('contenido');
            $table->string('resumen', 500)->nullable();
            $table->enum('prioridad', ['baja', 'normal', 'alta', 'urgente'])->default('normal');
            $table->enum('categoria', ['general', 'academico', 'administrativo', 'sindical', 'urgente', 'evento'])->default('general');
            $table->string('destinatario_rol')->nullable(); // null = todos los empleados
            $table->foreignUuid('carrera_id')->nullable()->constrained('carreras')->nullOnDelete();
            $table->boolean('fijado')->default(false);
            $table->boolean('requiere_confirmacion')->default(false);
            $table->timestamp('publicado_at')->useCurrent();
            $table->timestamp('expira_at')->nullable();
            $table->foreignUuid('publicado_por_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('comunicado_lecturas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('comunicado_id')->constrained('comunicados')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('leido_at')->useCurrent();
            $table->unique(['comunicado_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comunicado_lecturas');
        Schema::dropIfExists('comunicados');
    }
};
