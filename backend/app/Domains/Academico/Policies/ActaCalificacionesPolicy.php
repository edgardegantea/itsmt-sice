<?php

namespace App\Domains\Academico\Policies;

use App\Models\User;

class ActaCalificacionesPolicy
{
    public function view(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', 'director_academico']);
    }

    public function firmar(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'director_academico']);
    }
}
