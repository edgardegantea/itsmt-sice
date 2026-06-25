<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('planeaciones_docentes', 'entregada_en')) {
            Schema::table('planeaciones_docentes', function (Blueprint $table) {
                $table->timestamp('entregada_en')->nullable()->after('fecha_entrega');
            });
        }
    }

    public function down(): void
    {
        Schema::table('planeaciones_docentes', function (Blueprint $table) {
            $table->dropColumn('entregada_en');
        });
    }
};
