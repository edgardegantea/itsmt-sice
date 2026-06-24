<?php

namespace App\Domains\Academico\Policies;

use App\Models\User;

class ConfiguracionEvaluacionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin', 'docente', 'jefe_carrera', 'director_academico']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['superadmin', 'admin']);
    }
}
