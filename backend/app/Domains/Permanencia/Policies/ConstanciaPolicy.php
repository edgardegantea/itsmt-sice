<?php

namespace App\Domains\Permanencia\Policies;

use App\Models\User;

class ConstanciaPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'jefe_carrera']);
    }

    public function create(User $user): bool
    {
        return $user->hasRole('alumno');
    }

    public function update(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo']);
    }
}
