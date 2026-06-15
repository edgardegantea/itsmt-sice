<?php

namespace App\Providers;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Academico\Models\Alumno;
use App\Domains\Institucional\Models\ConfiguracionInstitucional;
use App\Domains\Permanencia\Models\Reinscripcion;
use App\Domains\Permanencia\Models\Constancia;
use App\Domains\Permanencia\Models\Baja;
use App\Domains\Permanencia\Models\OrdenReinscripcion;
use App\Domains\Admision\Policies\AspirantePolicy;
use App\Domains\Academico\Policies\AlumnoPolicy;
use App\Domains\Institucional\Policies\ConfiguracionPolicy;
use App\Domains\Permanencia\Policies\ReinscripcionPolicy;
use App\Domains\Permanencia\Policies\ConstanciaPolicy;
use App\Domains\Permanencia\Policies\BajaPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Gate::policy(Aspirante::class, AspirantePolicy::class);
        Gate::policy(Alumno::class, AlumnoPolicy::class);
        Gate::policy(ConfiguracionInstitucional::class, ConfiguracionPolicy::class);
        Gate::policy(Reinscripcion::class, ReinscripcionPolicy::class);
        Gate::policy(Constancia::class, ConstanciaPolicy::class);
        Gate::policy(Baja::class, BajaPolicy::class);
        Gate::policy(OrdenReinscripcion::class, ReinscripcionPolicy::class);

        // Apunta el enlace de reset al frontend
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
            return "{$frontend}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
