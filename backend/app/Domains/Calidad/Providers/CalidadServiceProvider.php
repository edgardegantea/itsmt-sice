<?php

namespace App\Domains\Calidad\Providers;

use App\Domains\Calidad\Models\ActividadComplementaria;
use App\Domains\Calidad\Policies\ActividadComplementariaPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class CalidadServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(ActividadComplementaria::class, ActividadComplementariaPolicy::class);
    }
}
