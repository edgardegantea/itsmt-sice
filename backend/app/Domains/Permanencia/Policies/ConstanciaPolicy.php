<?php

namespace App\Domains\Permanencia\Policies;

use App\Models\User;

class ConstanciaPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'personal_administrativo', 'director_academico']);
    }

    public function update(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'personal_administrativo']);
    }
}
