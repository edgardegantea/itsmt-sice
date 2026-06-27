<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Crea un User (rol alumno) para cada alumno inscrito que aún no tenga user_id.
 *
 * Credenciales iniciales
 *   - usuario:   número de control
 *   - password:  CURP del aspirante (aspirantes.curp)
 *
 * Si el email ya está en uso (otro user), se genera uno derivado del número de control:
 *   <numero_control>@sice.local
 *
 * Se puede revertir: elimina los users creados y pone user_id = NULL en los alumnos.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Obtener (o crear) el rol alumno
        $rolAlumno = DB::table('roles')->where('name', 'alumno')->where('guard_name', 'web')->first();

        if (! $rolAlumno) {
            $rolId = DB::table('roles')->insertGetId([
                'name'       => 'alumno',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $rolId = $rolAlumno->id;
        }

        // Alumnos sin usuario
        $alumnos = DB::table('alumnos')
            ->whereNull('user_id')
            ->whereNull('deleted_at')
            ->join('inscripciones', 'alumnos.inscripcion_id', '=', 'inscripciones.id')
            ->join('aspirantes', 'inscripciones.aspirante_id', '=', 'aspirantes.id')
            ->select(
                'alumnos.id as alumno_id',
                'alumnos.numero_control',
                'aspirantes.email',
                'aspirantes.curp',
                'aspirantes.nombres',
                'aspirantes.apellido_paterno',
                'aspirantes.apellido_materno',
            )
            ->get();

        foreach ($alumnos as $a) {
            // Resolver email único
            $email = $a->email;
            if (DB::table('users')->where('email', $email)->exists()) {
                $email = Str::lower($a->numero_control) . '@sice.local';
            }

            // Nombre completo
            $nombre = trim(implode(' ', array_filter([
                $a->apellido_paterno,
                $a->apellido_materno,
                $a->nombres,
            ])));

            $userId = Str::uuid()->toString();

            DB::table('users')->insert([
                'id'         => $userId,
                'name'       => $nombre,
                'email'      => $email,
                'password'   => Hash::make($a->curp),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Asignar rol alumno (Spatie model_has_roles)
            DB::table('model_has_roles')->insert([
                'role_id'    => $rolId,
                'model_type' => 'App\\Models\\User',
                'model_id'   => $userId,
            ]);

            // Vincular alumno → user
            DB::table('alumnos')
                ->where('id', $a->alumno_id)
                ->update(['user_id' => $userId, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        // Obtener IDs de users creados para alumnos con rol alumno
        $userIds = DB::table('alumnos')
            ->whereNotNull('user_id')
            ->pluck('user_id');

        // Solo eliminar los que tienen exclusivamente el rol alumno
        // (evitar borrar usuarios con otros roles asignados manualmente)
        $rolAlumno = DB::table('roles')->where('name', 'alumno')->where('guard_name', 'web')->first();

        if ($rolAlumno) {
            $soloAlumno = DB::table('model_has_roles')
                ->whereIn('model_id', $userIds)
                ->where('role_id', $rolAlumno->id)
                ->pluck('model_id')
                ->filter(fn($id) =>
                    DB::table('model_has_roles')->where('model_id', $id)->count() === 1
                );

            DB::table('alumnos')->whereIn('user_id', $soloAlumno)->update(['user_id' => null]);
            DB::table('model_has_roles')->whereIn('model_id', $soloAlumno)->delete();
            DB::table('users')->whereIn('id', $soloAlumno)->delete();
        }
    }
};
