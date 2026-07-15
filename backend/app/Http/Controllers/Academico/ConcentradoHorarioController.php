<?php

namespace App\Http\Controllers\Academico;

use App\Exports\ConcentradoHorarioExport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ConcentradoHorarioController extends Controller
{
    // GET /horarios/concentrado?periodo_id=&carrera_id=
    public function export(Request $request): BinaryFileResponse
    {
        $data = $request->validate([
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
            'carrera_id' => ['nullable', 'uuid', 'exists:carreras,id'],
        ]);

        $carreraForzada = $request->user()?->carreraRestringida();

        return Excel::download(
            new ConcentradoHorarioExport(
                periodoId: $data['periodo_id'],
                carreraId: $carreraForzada ?? ($data['carrera_id'] ?? null),
            ),
            'concentrado-horarios.xlsx',
        );
    }
}
