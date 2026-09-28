<?php

namespace App\Domains\Institucional\Policies;

use App\Models\User;

class ConfiguracionPolicy
{
    public function update(User $user, ?\App\Domains\Institucional\Models\ConfiguracionInstitucional $config = null): bool
    {
        return $user->hasAnyRole(['admin', 'superadmin', 'direccion_general', 'direccion_academica', 'control_escolar']);
    }
}
