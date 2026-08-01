<?php

namespace App\Domains\Permanencia\Policies;

use App\Models\User;

class AdeudoPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'jefe_carrera']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo']);
    }

    public function update(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'personal_administrativo']);
    }

    public function delete(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin']);
    }
}
