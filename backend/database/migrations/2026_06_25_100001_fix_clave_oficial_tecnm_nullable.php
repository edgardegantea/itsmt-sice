<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Rellenar filas existentes que tengan null antes de cambiar la columna
        DB::table('materias')->whereNull('clave_oficial_tecnm')->update(['clave_oficial_tecnm' => '']);

        Schema::table('materias', function (Blueprint $table) {
            $table->string('clave_oficial_tecnm', 20)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->string('clave_oficial_tecnm', 20)->nullable()->change();
        });
    }
};
