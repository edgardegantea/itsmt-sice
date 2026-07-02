<?php

namespace App\Http\Controllers\Capacitacion;

use App\Domains\Capacitacion\Models\AsistenciaCapacitacion;
use App\Domains\Capacitacion\Models\CedulaInscripcion;
use App\Domains\Capacitacion\Models\CursoCapacitacion;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AsistenciaCapacitacionController extends Controller
{
    private const ROLES_JEFE = ['superadmin', 'admin', 'personal_administrativo',
                                  'subdireccion_academica', 'direccion_academica'];

    // GET /api/asistencias-capacitacion?cedula_id=xxx  (S10-09)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(array_merge(self::ROLES_JEFE, ['docente']))) {
            abort(403);
        }

        $request->validate([
            'cedula_id' => ['sometimes', 'uuid', 'exists:cedulas_inscripcion_capacitacion,id'],
            'curso_id'  => ['sometimes', 'uuid', 'exists:cursos_capacitacion,id'],
        ]);

        $query = AsistenciaCapacitacion::with(['cedula.usuario', 'cedula.curso'])
            ->when($request->query('cedula_id'), fn($q, $v) => $q->where('cedula_id', $v))
            ->when($request->query('curso_id'), fn($q, $v) =>
                $q->whereHas('cedula', fn($cq) => $cq->where('curso_id', $v))
            )
            ->latest('fecha');

        return ApiResponse::success($query->paginate(50));
    }

    // POST /api/asistencias-capacitacion  (S10-09)
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        $data = $request->validate([
            'cedula_id' => ['required', 'uuid', 'exists:cedulas_inscripcion_capacitacion,id'],
            'fecha'     => ['required', 'date'],
            'presente'  => ['required', 'boolean'],
        ]);

        $existente = AsistenciaCapacitacion::where('cedula_id', $data['cedula_id'])
            ->whereDate('fecha', $data['fecha'])
            ->first();

        if ($existente) {
            $existente->update(['presente' => $data['presente']]);
            $asistencia = $existente;
        } else {
            $asistencia = AsistenciaCapacitacion::create($data);
        }

        // Actualizar contador en la cédula
        $cedula = CedulaInscripcion::find($data['cedula_id']);
        if ($cedula) {
            $numPresentes = AsistenciaCapacitacion::where('cedula_id', $cedula->id)
                ->where('presente', true)
                ->count();
            $cedula->update(['num_asistencias' => $numPresentes]);
        }

        return ApiResponse::success(
            $asistencia->load(['cedula.usuario']),
            'Asistencia registrada.',
            201
        );
    }

    // GET /api/cursos-capacitacion/{curso}/lista-asistencia/pdf  (S10-09)
    public function listaAsistenciaPdf(CursoCapacitacion $cursoCapacitacion): Response
    {
        $cedulas = $cursoCapacitacion->cedulas()
            ->with(['usuario', 'asistencias'])
            ->get();

        // Obtener fechas únicas del curso
        $fechas = AsistenciaCapacitacion::whereIn(
            'cedula_id',
            $cedulas->pluck('id')
        )->orderBy('fecha')->distinct()->pluck('fecha');

        $pdf = Pdf::loadView('pdfs.lista_asistencia_capacitacion', [
            'curso'   => $cursoCapacitacion->load('jefeDepto'),
            'cedulas' => $cedulas,
            'fechas'  => $fechas,
        ])->setPaper('letter', 'landscape');

        return $pdf->download("lista_asistencia_{$cursoCapacitacion->id}.pdf");
    }

    // GET /api/registro-general-capacitacion  (S10-11)
    public function registroGeneral(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        $cursos = CursoCapacitacion::with(['jefeDepto', 'cedulas.usuario'])
            ->when($request->query('tipo'), fn($q, $v) => $q->where('tipo', $v))
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->latest()
            ->get()
            ->map(function ($curso) {
                return [
                    'id'              => $curso->id,
                    'nombre'          => $curso->nombre,
                    'tipo'            => $curso->tipo,
                    'modalidad'       => $curso->modalidad,
                    'estatus'         => $curso->estatus,
                    'horas_totales'   => $curso->horas_totales,
                    'periodo_inicio'  => $curso->periodo_inicio,
                    'periodo_fin'     => $curso->periodo_fin,
                    'jefe_depto'      => $curso->jefeDepto?->name,
                    'total_inscritos' => $curso->cedulas->count(),
                    'total_acreditados' => $curso->cedulas
                        ->whereIn('estatus', ['acreditado'])->count(),
                ];
            });

        return ApiResponse::success($cursos);
    }

    // GET /api/registro-general-capacitacion/pdf  (S10-11)
    public function registroGeneralPdf(Request $request): Response
    {
        if (! $request->user()->hasAnyRole(self::ROLES_JEFE)) {
            abort(403);
        }

        $cursos = CursoCapacitacion::with(['jefeDepto', 'cedulas.usuario'])
            ->when($request->query('tipo'), fn($q, $v) => $q->where('tipo', $v))
            ->latest()
            ->get();

        $pdf = Pdf::loadView('pdfs.registro_general_capacitacion', [
            'cursos' => $cursos,
            'fecha'  => now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY'),
        ])->setPaper('letter', 'landscape');

        return $pdf->download('registro_general_capacitacion.pdf');
    }
}
