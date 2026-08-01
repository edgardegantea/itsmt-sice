<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planteles', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('clave', 10)->unique();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        $ahora = now();
        DB::table('planteles')->insert([
            ['nombre' => 'Martínez de la Torre', 'clave' => 'MT', 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
            ['nombre' => 'Vega de Alatorre',      'clave' => 'VA', 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('planteles');
    }
};
