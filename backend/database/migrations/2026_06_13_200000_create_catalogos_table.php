<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estados', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('clave_curp', 2)->unique();
            $table->timestamps();
        });

        Schema::create('municipios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estado_id')->constrained()->cascadeOnDelete();
            $table->string('nombre', 150);
            $table->timestamps();
            $table->index('estado_id');
        });

        Schema::create('escuelas_bachillerato', function (Blueprint $table) {
            $table->id();
            $table->foreignId('municipio_id')->nullable()->constrained()->nullOnDelete();
            $table->string('nombre', 200);
            $table->string('tipo', 30)->default('preparatoria');
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->index('municipio_id');
        });

        Schema::create('turnos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50);
            $table->string('clave', 30)->unique();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escuelas_bachillerato');
        Schema::dropIfExists('municipios');
        Schema::dropIfExists('estados');
        Schema::dropIfExists('turnos');
    }
};
