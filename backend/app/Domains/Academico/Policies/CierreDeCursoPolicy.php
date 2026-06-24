<?php

namespace App\Domains\Academico\Policies;

use App\Models\User;

class CierreDeCursoPolicy
{
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera']);
    }
}
