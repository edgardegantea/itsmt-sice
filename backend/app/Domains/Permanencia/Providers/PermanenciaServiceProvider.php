<?php

namespace App\Domains\Permanencia\Providers;

use App\Domains\Permanencia\Models\Adeudo;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Permanencia\Models\Constancia;
use App\Domains\Permanencia\Models\OrdenReinscripcion;
use App\Domains\Permanencia\Models\Reinscripcion;
use App\Domains\Permanencia\Policies\AdeudoPolicy;
use App\Domains\Permanencia\Policies\BajaPolicy;
use App\Domains\Permanencia\Policies\ConstanciaPolicy;
use App\Domains\Permanencia\Policies\OrdenReinscripcionPolicy;
use App\Domains\Permanencia\Policies\ReinscripcionPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class PermanenciaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Reinscripcion::class, ReinscripcionPolicy::class);
        Gate::policy(Constancia::class, ConstanciaPolicy::class);
        Gate::policy(Baja::class, BajaPolicy::class);
        Gate::policy(OrdenReinscripcion::class, OrdenReinscripcionPolicy::class);
        Gate::policy(Adeudo::class, AdeudoPolicy::class);
    }
}
