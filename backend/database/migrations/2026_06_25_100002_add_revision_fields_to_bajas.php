<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bajas', function (Blueprint $table) {
            $table->string('motivo_rechazo')->nullable()->after('motivo_texto');
            $table->foreignUuid('revisada_por')->nullable()->constrained('users')->nullOnDelete()->after('registrada_por');
            $table->timestamp('revisada_en')->nullable()->after('revisada_por');
        });
    }

    public function down(): void
    {
        Schema::table('bajas', function (Blueprint $table) {
            $table->dropForeign(['revisada_por']);
            $table->dropColumn(['motivo_rechazo', 'revisada_por', 'revisada_en']);
        });
    }
};
