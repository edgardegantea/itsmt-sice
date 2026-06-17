<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('encuestas_socioeconomicas', function (Blueprint $table) {
            $table->string('foto_infantil_path')->nullable()->after('informacion_adicional');
            $table->string('dp_curp', 18)->nullable()->after('foto_infantil_path');
            $table->date('dp_fecha_nacimiento')->nullable()->after('dp_curp');
            $table->string('dp_lugar_nacimiento', 120)->nullable()->after('dp_fecha_nacimiento');
            $table->string('dp_sexo', 20)->nullable()->after('dp_lugar_nacimiento');
            $table->string('dp_estado_civil', 30)->nullable()->after('dp_sexo');
            $table->string('dp_telefono', 20)->nullable()->after('dp_estado_civil');
            $table->string('dp_email', 150)->nullable()->after('dp_telefono');
            $table->string('dp_municipio_procedencia', 120)->nullable()->after('dp_email');
            $table->string('dp_escuela_bachillerato', 220)->nullable()->after('dp_municipio_procedencia');
        });
    }

    public function down(): void
    {
        Schema::table('encuestas_socioeconomicas', function (Blueprint $table) {
            $table->dropColumn([
                'foto_infantil_path',
                'dp_curp', 'dp_fecha_nacimiento', 'dp_lugar_nacimiento',
                'dp_sexo', 'dp_estado_civil', 'dp_telefono', 'dp_email',
                'dp_municipio_procedencia', 'dp_escuela_bachillerato',
            ]);
        });
    }
};
