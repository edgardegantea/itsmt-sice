<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('disponibilidades_docente', function (Blueprint $table) {
            $table->unsignedTinyInteger('modulo_sabatino')->nullable()->after('dia_semana');
        });
    }

    public function down(): void
    {
        Schema::table('disponibilidades_docente', function (Blueprint $table) {
            $table->dropColumn('modulo_sabatino');
        });
    }
};
