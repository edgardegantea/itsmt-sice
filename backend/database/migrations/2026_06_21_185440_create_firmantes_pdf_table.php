<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('firmantes_pdf', function (Blueprint $table) {
            $table->id();
            $table->string('clave')->unique();  // ej. subdirector_academico, jefe_servicios_escolares
            $table->string('nombre');           // nombre completo del firmante
            $table->string('cargo');            // título que aparece bajo la línea de firma
            $table->unsignedTinyInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firmantes_pdf');
    }
};
