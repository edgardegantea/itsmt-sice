<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->string('clave_oficial_tecnm', 50)->nullable()->change();
            $table->string('satca', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('materias', function (Blueprint $table) {
            $table->string('clave_oficial_tecnm', 20)->nullable()->change();
            $table->string('satca', 20)->nullable()->change();
        });
    }
};
