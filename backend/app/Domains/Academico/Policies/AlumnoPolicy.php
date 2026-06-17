<?php

namespace App\Domains\Academico\Policies;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;

class AlumnoPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo']);
    }

    public function view(User $user, Alumno $alumno): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if ($user->hasRole('jefe_carrera')) {
            return $user->carrera_id && $user->carrera_id === $alumno->carrera_id;
        }
        return $user->hasAnyRole(['admin', 'director_academico', 'personal_administrativo']);
    }

    public function update(User $user, Alumno $alumno): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if ($user->hasRole('jefe_carrera')) {
            return $user->carrera_id && $user->carrera_id === $alumno->carrera_id;
        }
        return $user->hasAnyRole(['admin', 'personal_administrativo']);
    }
}
