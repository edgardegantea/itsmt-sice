<?php

namespace App\Console\Commands;

use App\Domains\Convocatoria\Models\Convocatoria;
use Illuminate\Console\Command;

class CerrarConvocatoriasCommand extends Command
{
    protected $signature   = 'convocatorias:cerrar';
    protected $description = 'Cierra automáticamente las convocatorias cuya fecha_limite ha vencido';

    public function handle(): int
    {
        $afectadas = Convocatoria::where('estatus', 'activa')
            ->where('fecha_limite', '<', now()->toDateString())
            ->update(['estatus' => 'cerrada']);

        $this->info("Convocatorias cerradas automáticamente: {$afectadas}");

        return self::SUCCESS;
    }
}
