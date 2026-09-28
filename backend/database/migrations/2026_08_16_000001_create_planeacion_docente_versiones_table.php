<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planeacion_docente_versiones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('planeacion_docente_id')->constrained('planeaciones_docentes')->cascadeOnDelete();
            $table->foreignUuid('creado_por')->nullable()->constrained('users')->nullOnDelete();
            // 'autoguardado' | 'envio' | 'cambio_estatus' | 'restaurada'
            $table->string('motivo');
            $table->json('snapshot');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planeacion_docente_versiones');
    }
};
