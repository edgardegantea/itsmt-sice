<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bajas', function (Blueprint $table) {
            $table->boolean('reingreso_registrado')->default(false);
            $table->date('fecha_reingreso')->nullable();
            $table->foreignUuid('reingreso_por')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bajas', function (Blueprint $table) {
            $table->dropForeign(['reingreso_por']);
            $table->dropColumn(['reingreso_registrado', 'fecha_reingreso', 'reingreso_por']);
        });
    }
};
