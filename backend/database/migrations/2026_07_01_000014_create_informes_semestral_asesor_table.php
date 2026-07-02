<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('informes_semestral_asesor', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('residencia_id');
            $table->foreign('residencia_id')->references('id')->on('residencias_profesionales')->cascadeOnDelete();
            $table->uuid('asesor_id');
            $table->foreign('asesor_id')->references('id')->on('users');
            $table->string('periodo', 20);
            $table->text('contenido');
            $table->enum('estatus', ['borrador', 'enviado', 'revisado'])->default('borrador');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('informes_semestral_asesor');
    }
};
