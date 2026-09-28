<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planeacion_docente_archivos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('planeacion_docente_id')->constrained('planeaciones_docentes')->cascadeOnDelete();
            $table->foreignUuid('subido_por')->nullable()->constrained('users')->nullOnDelete();
            // null = adjunto general de la planeación; con valor = ligado a esa unidad
            // (rúbricas/material didáctico específico de una unidad, p. ej.).
            $table->unsignedInteger('unidad')->nullable();
            $table->string('nombre_original');
            $table->string('path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('tamano_bytes')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planeacion_docente_archivos');
    }
};
