<?php

namespace App\Domains\Academico\Policies;

use App\Models\User;

class CalificacionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'docente', 'jefe_carrera', 'director_academico', 'alumno']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'docente']);
    }

    public function update(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'docente']);
    }
}
