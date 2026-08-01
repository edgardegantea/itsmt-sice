<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Un docente puede estar asignado a una o varias carreras (antes solo se podía
 * expresar una única carrera vía users.carrera_id, campo que se deja intacto
 * porque sigue siendo la fuente de verdad para restringir a jefe_carrera).
 *
 * Tabla puramente pivote (nunca se referencia por FK externa), por eso usa un
 * id autoincremental normal en vez de UUID como el resto del esquema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docente_carrera', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('docente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('carrera_id')->constrained('carreras')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['docente_id', 'carrera_id']);
        });

        // Backfill: cualquier usuario que ya tenía una carrera única en
        // users.carrera_id conserva esa relación como su primera carrera
        // asignada. No se filtra por rol vía Spatie aquí a propósito: en un
        // `migrate` limpio (tests con RefreshDatabase, entorno nuevo) la
        // tabla `roles` puede no estar sembrada todavía cuando corre esta
        // migración, y User::role('docente') lanzaría una excepción.
        $ahora = now();
        DB::table('users')
            ->whereNotNull('carrera_id')
            ->select('id', 'carrera_id')
            ->orderBy('id')
            ->get()
            ->each(function ($usuario) use ($ahora) {
                DB::table('docente_carrera')->insertOrIgnore([
                    'docente_id' => $usuario->id,
                    'carrera_id' => $usuario->carrera_id,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('docente_carrera');
    }
};
