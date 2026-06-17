<?php

namespace App\Domains\Permanencia\Policies;

use App\Models\User;

class ReinscripcionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'personal_administrativo', 'director_academico', 'jefe_carrera', 'alumno']);
    }

    public function update(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'personal_administrativo']);
    }

    public function create(User $user): bool
    {
        return $user->hasRole('alumno');
    }
}
