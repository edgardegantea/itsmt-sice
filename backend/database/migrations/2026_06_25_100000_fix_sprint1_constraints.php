<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // S1-01: email único por (email, periodo_id) no globalmente
        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropUnique(['email']);
            $table->unique(['email', 'periodo_id'], 'aspirantes_email_periodo_unique');
        });

        // S1-04: un aspirante solo puede ser inscrito una vez
        Schema::table('inscripciones', function (Blueprint $table) {
            $table->unique('aspirante_id');
        });

        // S1-09: cobros de inscripción únicos por alumno+periodo
        Schema::table('recibos_cobro', function (Blueprint $table) {
            $table->foreignUuid('periodo_id')
                ->nullable()
                ->constrained('periodos')
                ->nullOnDelete()
                ->after('alumno_id');
            $table->unique(['alumno_id', 'periodo_id'], 'recibos_cobro_alumno_periodo_unique');
        });
    }

    public function down(): void
    {
        Schema::table('recibos_cobro', function (Blueprint $table) {
            $table->dropUnique('recibos_cobro_alumno_periodo_unique');
            $table->dropForeign(['periodo_id']);
            $table->dropColumn('periodo_id');
        });

        Schema::table('inscripciones', function (Blueprint $table) {
            $table->dropUnique(['aspirante_id']);
        });

        Schema::table('aspirantes', function (Blueprint $table) {
            $table->dropUnique('aspirantes_email_periodo_unique');
            $table->unique('email');
        });
    }
};
