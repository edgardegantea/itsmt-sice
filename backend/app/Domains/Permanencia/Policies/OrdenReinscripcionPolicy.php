<?php

namespace App\Domains\Permanencia\Policies;

use App\Models\User;

class OrdenReinscripcionPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // alumno, admin y docente pueden consultar el orden publicado
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera']);
    }
}
