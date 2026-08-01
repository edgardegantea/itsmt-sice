<?php

namespace App\Domains\Admision\Providers;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Admision\Policies\AspirantePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AdmisionServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Aspirante::class, AspirantePolicy::class);
    }
}
