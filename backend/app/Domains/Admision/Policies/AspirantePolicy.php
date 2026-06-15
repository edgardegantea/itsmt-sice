<?php

namespace App\Domains\Admision\Policies;

use App\Domains\Admision\Models\Aspirante;
use App\Models\User;

class AspirantePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(['admin', 'director_academico', 'jefe_carrera', 'personal_administrativo']);
    }

    public function view(User $user, Aspirante $aspirante): bool
    {
        return $user->hasRole(['admin', 'director_academico', 'jefe_carrera', 'personal_administrativo']);
    }

    public function update(User $user, Aspirante $aspirante): bool
    {
        return $user->hasRole(['admin', 'personal_administrativo']);
    }

    public function inscribir(User $user, Aspirante $aspirante): bool
    {
        return $user->hasRole(['admin', 'personal_administrativo']);
    }
}
