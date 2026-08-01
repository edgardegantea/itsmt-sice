<?php

namespace App\Domains\Academico\Providers;

use App\Domains\Academico\Models\ActaCalificaciones;
use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\ConfiguracionEvaluacion;
use App\Domains\Academico\Policies\ActaCalificacionesPolicy;
use App\Domains\Academico\Policies\AlumnoPolicy;
use App\Domains\Academico\Policies\CalificacionPolicy;
use App\Domains\Academico\Policies\CierreDeCursoPolicy;
use App\Domains\Academico\Policies\ConfiguracionEvaluacionPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AcademicoServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Alumno::class, AlumnoPolicy::class);
        Gate::policy(Calificacion::class, CalificacionPolicy::class);
        Gate::policy(CierreDeCurso::class, CierreDeCursoPolicy::class);
        Gate::policy(ActaCalificaciones::class, ActaCalificacionesPolicy::class);
        Gate::policy(ConfiguracionEvaluacion::class, ConfiguracionEvaluacionPolicy::class);
    }
}
