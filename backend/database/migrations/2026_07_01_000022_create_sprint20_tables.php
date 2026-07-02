<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convocatorias', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('titulo');
            $table->text('descripcion');
            $table->enum('tipo', ['beca', 'movilidad', 'ss', 'curso_verano', 'concurso', 'bolsa_trabajo', 'otro']);
            $table->json('audiencia')->nullable(); // {roles:[], carrera_ids:[], semestres:[]}
            $table->date('fecha_apertura');
            $table->date('fecha_limite');
            $table->integer('cupo_maximo')->nullable();
            $table->enum('estatus', ['borrador', 'activa', 'cerrada', 'resultados_publicados'])->default('borrador');
            $table->foreignUuid('publicada_por')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('requisitos_convocatoria', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $table->string('descripcion');
            $table->string('tipo_documento')->nullable();
            $table->boolean('obligatorio')->default(true);
            $table->timestamps();
            // NO soft deletes
        });

        Schema::create('postulaciones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('convocatoria_id')->constrained('convocatorias')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('estatus', ['pendiente', 'en_revision', 'admitido', 'no_admitido'])->default('pendiente');
            $table->json('documentos')->nullable(); // array of URLs
            $table->text('observaciones')->nullable();
            $table->foreignUuid('revisado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fecha_postulacion')->useCurrent();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['convocatoria_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulaciones');
        Schema::dropIfExists('requisitos_convocatoria');
        Schema::dropIfExists('convocatorias');
    }
};
