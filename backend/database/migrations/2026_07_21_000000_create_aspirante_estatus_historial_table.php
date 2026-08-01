<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aspirante_estatus_historial', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('aspirante_id')->constrained('aspirantes')->cascadeOnDelete();
            $table->string('estatus_anterior');
            $table->string('estatus_nuevo');
            $table->text('motivo')->nullable();
            $table->foreignUuid('cambiado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aspirante_estatus_historial');
    }
};
