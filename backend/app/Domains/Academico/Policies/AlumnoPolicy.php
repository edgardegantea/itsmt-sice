<?php

namespace App\Domains\Academico\Policies;

use App\Domains\Academico\Models\Alumno;
use App\Models\User;

class AlumnoPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(['admin', 'director_academico', 'jefe_carrera', 'personal_administrativo']);
    }

    public function view(User $user, Alumno $alumno): bool
    {
        return $user->hasRole(['admin', 'director_academico', 'jefe_carrera', 'personal_administrativo']);
    }

    public function update(User $user, Alumno $alumno): bool
    {
        return $user->hasRole(['admin', 'personal_administrativo']);
    }
}
