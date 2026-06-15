<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carreras', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre');
            $table->string('clave')->unique();
            $table->string('codigo_it', 3);         // 2-3 dígitos para número de control TecNM
            $table->string('plan_clave')->nullable(); // clave oficial plan de estudios TecNM
            $table->string('especialidad')->nullable();
            $table->uuid('coordinador_id')->nullable();
            $table->foreign('coordinador_id')->references('id')->on('users')->nullOnDelete();
            $table->boolean('activa')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carreras');
    }
};
