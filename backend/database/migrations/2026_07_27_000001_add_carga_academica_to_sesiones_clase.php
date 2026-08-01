<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sesiones_clase', function (Blueprint $table) {
            $table->foreignUuid('carga_academica_id')
                ->nullable()
                ->after('grupo_id')
                ->constrained('cargas_academicas')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sesiones_clase', function (Blueprint $table) {
            $table->dropConstrainedForeignId('carga_academica_id');
        });
    }
};
