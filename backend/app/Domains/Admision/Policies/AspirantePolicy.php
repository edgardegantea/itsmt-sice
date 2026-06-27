<?php

namespace App\Domains\Admision\Policies;

use App\Domains\Admision\Models\Aspirante;
use App\Models\User;

class AspirantePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo',
            ...User::ROLES_DIRECTIVOS,
        ]);
    }

    public function view(User $user, Aspirante $aspirante): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if ($user->hasRole('jefe_carrera')) {
            return $user->carrera_id && $user->carrera_id === $aspirante->carrera_id;
        }
        return $user->hasAnyRole([
            'admin', 'director_academico', 'personal_administrativo',
            ...User::ROLES_DIRECTIVOS,
        ]);
    }

    public function update(User $user, Aspirante $aspirante): bool
    {
        if ($user->hasRole('superadmin')) return true;
        if ($user->hasRole('jefe_carrera')) {
            return $user->carrera_id && $user->carrera_id === $aspirante->carrera_id;
        }
        return $user->hasAnyRole([
            'admin', 'personal_administrativo',
            ...User::ROLES_DIRECTIVOS,
        ]);
    }

    public function inscribir(User $user, Aspirante $aspirante): bool
    {
        return $user->hasAnyRole([
            'superadmin', 'admin', 'personal_administrativo',
            ...User::ROLES_DIRECTIVOS,
        ]);
    }
}
