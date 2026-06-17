<?php

namespace App\Domains\Permanencia\Policies;

use App\Models\User;

class BajaPolicy
{
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera']);
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'jefe_carrera']);
    }

    // Alumno solicita su propia baja temporal
    public function solicitar(User $user): bool
    {
        return $user->hasRole('alumno');
    }
}
