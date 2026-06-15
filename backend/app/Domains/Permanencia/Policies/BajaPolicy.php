<?php

namespace App\Domains\Permanencia\Policies;

use App\Models\User;

class BajaPolicy
{
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'personal_administrativo']);
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'personal_administrativo', 'director_academico', 'jefe_carrera']);
    }
}
