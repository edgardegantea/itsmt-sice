<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('directorio_personal', function (Blueprint $table) {
            $table->string('clave_firma')->nullable()->unique()->after('firma_documentos');
        });

        // Revertir la tabla firmantes_pdf ya que el directorio cubre ese caso
        Schema::dropIfExists('firmantes_pdf');
    }

    public function down(): void
    {
        Schema::table('directorio_personal', function (Blueprint $table) {
            $table->dropColumn('clave_firma');
        });
    }
};
