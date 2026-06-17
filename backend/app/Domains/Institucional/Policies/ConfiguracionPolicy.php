<?php

namespace App\Domains\Institucional\Policies;

use App\Models\User;

class ConfiguracionPolicy
{
    public function update(User $user): bool
    {
        return $user->hasRole(['admin', 'superadmin']);
    }
}
