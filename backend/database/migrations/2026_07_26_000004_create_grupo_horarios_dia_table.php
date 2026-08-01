<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

// Reemplaza la ventana horaria única del grupo (hora_inicio/hora_fin) por un
// horario personalizado por día de la semana, para grupos cuyo horario varía
// entre días (ej. entre semana 07:00-13:00 pero sábado 08:00-17:00).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupo_horarios_dia', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('grupo_id');
            $table->foreign('grupo_id')->references('id')->on('grupos')->cascadeOnDelete();
            $table->enum('dia_semana', ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']);
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->timestamps();
            $table->unique(['grupo_id', 'dia_semana']);
        });

        // Backfill: los grupos que ya tenían hora_inicio/hora_fin únicos se
        // migran a una fila por cada día de lunes a sábado con esa misma
        // ventana, para no cambiar su comportamiento actual.
        $dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

        DB::table('grupos')
            ->whereNotNull('hora_inicio')
            ->whereNotNull('hora_fin')
            ->orderBy('id')
            ->select('id', 'hora_inicio', 'hora_fin')
            ->cursor()
            ->each(function ($grupo) use ($dias) {
                foreach ($dias as $dia) {
                    DB::table('grupo_horarios_dia')->insert([
                        'id'          => (string) Str::uuid(),
                        'grupo_id'    => $grupo->id,
                        'dia_semana'  => $dia,
                        'hora_inicio' => $grupo->hora_inicio,
                        'hora_fin'    => $grupo->hora_fin,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ]);
                }
            });

        Schema::table('grupos', function (Blueprint $table) {
            $table->dropColumn(['hora_inicio', 'hora_fin']);
        });
    }

    public function down(): void
    {
        Schema::table('grupos', function (Blueprint $table) {
            $table->time('hora_inicio')->nullable()->after('turno');
            $table->time('hora_fin')->nullable()->after('hora_inicio');
        });

        Schema::dropIfExists('grupo_horarios_dia');
    }
};
