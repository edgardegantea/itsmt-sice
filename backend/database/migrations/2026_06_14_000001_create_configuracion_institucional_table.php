<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configuracion_institucional', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_institucion')->default('Instituto Tecnológico Superior de Martínez de la Torre');
            $table->string('nombre_corto')->default('ITSMT');
            $table->string('clave_tecnm')->nullable();
            $table->string('dependencia')->nullable()->default('Tecnológico Nacional de México');
            $table->string('subsistema')->nullable()->default('Subdirección Académica · Departamento de Servicios Escolares');
            $table->string('direccion')->nullable();
            $table->string('ciudad')->nullable()->default('Martínez de la Torre');
            $table->string('estado')->nullable()->default('Veracruz');
            $table->string('cp', 10)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('email_institucional')->nullable();
            $table->string('sitio_web')->nullable();
            $table->string('logo_principal')->nullable();   // ruta en storage
            $table->string('logo_secundario')->nullable();  // ej. logo TecNM
            $table->string('color_primario', 7)->default('#1a3a5c');
            $table->string('color_secundario', 7)->default('#2d6a9f');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_institucional');
    }
};
