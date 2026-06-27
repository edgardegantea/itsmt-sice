<?php

namespace App\Domains\Calidad\Policies;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Calidad\Models\ActividadComplementaria;
use App\Models\User;

class ActividadComplementariaPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'alumno', 'jefe_carrera', ...User::ROLES_DIRECTIVOS]);
    }

    public function create(User $user): bool
    {
        return $user->hasRole('alumno');
    }

    public function validar(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', ...User::ROLES_DIRECTIVOS]);
    }

    public function delete(User $user, ActividadComplementaria $actividad): bool
    {
        // Solo el alumno dueño puede retirar mientras esté en 'registrada'
        if ($actividad->estatus !== 'registrada') {
            return false;
        }
        $alumnoDelUser = Alumno::where('user_id', $user->id)->first();
        return $alumnoDelUser && $alumnoDelUser->id === $actividad->alumno_id;
    }
}
