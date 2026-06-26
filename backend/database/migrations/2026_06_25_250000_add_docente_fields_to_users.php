<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('clave_empleado')->nullable()->after('carrera_id');
            $table->string('no_huella')->nullable()->after('clave_empleado');
            $table->string('nombramiento')->nullable()->after('no_huella');
            $table->string('tipo_horas')->nullable()->after('nombramiento'); // A, B, TC, Honorarios
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['clave_empleado', 'no_huella', 'nombramiento', 'tipo_horas']);
        });
    }
};
