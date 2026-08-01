<?php

use App\Providers\AppServiceProvider;
use App\Domains\Academico\Providers\AcademicoServiceProvider;
use App\Domains\Admision\Providers\AdmisionServiceProvider;
use App\Domains\Permanencia\Providers\PermanenciaServiceProvider;
use App\Domains\Calidad\Providers\CalidadServiceProvider;
use App\Domains\Institucional\Providers\InstitucionalServiceProvider;

return [
    AppServiceProvider::class,
    AcademicoServiceProvider::class,
    AdmisionServiceProvider::class,
    PermanenciaServiceProvider::class,
    CalidadServiceProvider::class,
    InstitucionalServiceProvider::class,
];
