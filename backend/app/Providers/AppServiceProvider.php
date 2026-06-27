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
use App\Domains\Permanencia\Policies\OrdenReinscripcionPolicy;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\ActaCalificaciones;
use App\Domains\Academico\Models\ConfiguracionEvaluacion;
use App\Domains\Academico\Policies\CalificacionPolicy;
use App\Domains\Academico\Policies\CierreDeCursoPolicy;
use App\Domains\Academico\Policies\ActaCalificacionesPolicy;
use App\Domains\Academico\Policies\ConfiguracionEvaluacionPolicy;
use App\Domains\Calidad\Models\ActividadComplementaria;
use App\Domains\Calidad\Policies\ActividadComplementariaPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        ini_set('memory_limit', env('PHP_MEMORY_LIMIT', '256M'));
    }

    public function boot(): void
    {
        // Superadmin bypasses every Gate / Policy check in the system.
        Gate::before(function ($user) {
            if ($user->hasRole('superadmin')) {
                return true;
            }
        });

        Gate::policy(Aspirante::class, AspirantePolicy::class);
        Gate::policy(Alumno::class, AlumnoPolicy::class);
        Gate::policy(ConfiguracionInstitucional::class, ConfiguracionPolicy::class);
        Gate::policy(Reinscripcion::class, ReinscripcionPolicy::class);
        Gate::policy(Constancia::class, ConstanciaPolicy::class);
        Gate::policy(Baja::class, BajaPolicy::class);
        Gate::policy(OrdenReinscripcion::class, OrdenReinscripcionPolicy::class);
        Gate::policy(Calificacion::class, CalificacionPolicy::class);
        Gate::policy(CierreDeCurso::class, CierreDeCursoPolicy::class);
        Gate::policy(ActaCalificaciones::class, ActaCalificacionesPolicy::class);
        Gate::policy(ConfiguracionEvaluacion::class, ConfiguracionEvaluacionPolicy::class);
        Gate::policy(ActividadComplementaria::class, ActividadComplementariaPolicy::class);

        // Apunta el enlace de reset al frontend
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
            return "{$frontend}/reset-password?token={$token}&email=" . urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
