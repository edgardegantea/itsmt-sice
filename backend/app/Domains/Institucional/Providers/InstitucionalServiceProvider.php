<?php

namespace App\Domains\Institucional\Providers;

use App\Domains\Institucional\Models\ConfiguracionInstitucional;
use App\Domains\Institucional\Policies\ConfiguracionPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class InstitucionalServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(ConfiguracionInstitucional::class, ConfiguracionPolicy::class);
    }
}
