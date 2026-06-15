<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->string('subdirector_academico')->nullable()->after('sitio_web');
            $table->string('responsable_servicios_escolares')->nullable()->after('subdirector_academico');
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_institucional', function (Blueprint $table) {
            $table->dropColumn(['subdirector_academico', 'responsable_servicios_escolares']);
        });
    }
};
