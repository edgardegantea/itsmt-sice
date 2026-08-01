<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('curp', 18)->nullable()->after('tipo_horas');
            $table->string('rfc', 13)->nullable()->after('curp');
            $table->date('fecha_nacimiento')->nullable()->after('rfc');
            $table->string('sexo')->nullable()->after('fecha_nacimiento');
            $table->string('estado_civil')->nullable()->after('sexo');
            $table->string('direccion')->nullable()->after('estado_civil');
            $table->string('telefono', 20)->nullable()->after('direccion');
            $table->string('contacto_emergencia_nombre')->nullable()->after('telefono');
            $table->string('contacto_emergencia_telefono', 20)->nullable()->after('contacto_emergencia_nombre');
            $table->string('foto_path')->nullable()->after('contacto_emergencia_telefono');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'curp', 'rfc', 'fecha_nacimiento', 'sexo', 'estado_civil',
                'direccion', 'telefono', 'contacto_emergencia_nombre',
                'contacto_emergencia_telefono', 'foto_path',
            ]);
        });
    }
};
