<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\FichaDocente;
use App\Domains\Academico\Models\CargaAcademica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FichaDocenteController extends Controller
{
    private const ROLES_ADMIN  = ['superadmin', 'admin', 'control_escolar',
                                   'direccion_academica', 'subdireccion_academica'];
    private const ROLES_VIEWER = ['superadmin', 'admin', 'control_escolar', 'director_academico',
                                   'direccion_academica', 'subdireccion_academica', 'jefe_carrera'];

    // GET /api/docentes/fichas  (S11-04)
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_VIEWER)) {
            abort(403);
        }

        $carreraForzada = $request->user()->carreraRestringida();

        $fichas = FichaDocente::with('docente')
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('docente', fn($uq) => $uq->deCarrera($v))
            )
            ->when($request->activo !== null, fn($q) =>
                $q->where('activo', filter_var($request->activo, FILTER_VALIDATE_BOOLEAN)))
            ->when($request->tipo_contrato, fn($q, $v) => $q->where('tipo_contrato', $v))
            ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($fichas);
    }

    // POST /api/docentes/fichas  (S11-04)
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            abort(403);
        }

        $data = $request->validate([
            'docente_id'     => ['required', 'uuid', 'exists:users,id',
                                 'unique:fichas_docentes,docente_id'],
            'tipo_contrato'  => ['required', 'in:base,interino,hora_clase,medio_tiempo'],
            'categoria'      => ['nullable', 'string', 'max:100'],
            'especialidades' => ['nullable', 'array'],
            'fecha_ingreso'  => ['nullable', 'date'],
            'titulos_academicos' => ['nullable', 'array'],
            'activo'         => ['sometimes', 'boolean'],
        ]);

        // Calcular horas frente a grupo por periodo automáticamente
        $horasPorPeriodo = $this->calcularHorasPorPeriodo($data['docente_id']);

        $ficha = FichaDocente::create(array_merge($data, [
            'horas_frente_grupo_por_periodo' => $horasPorPeriodo,
        ]));

        return ApiResponse::success($ficha->load('docente'), 'Ficha docente registrada.', 201);
    }

    // PATCH /api/docentes/{docente}/ficha  (S11-04)
    public function update(Request $request, User $docente): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_ADMIN)) {
            abort(403);
        }

        $ficha = FichaDocente::firstOrCreate(
            ['docente_id' => $docente->id],
            ['tipo_contrato' => 'hora_clase']
        );

        $data = $request->validate([
            'tipo_contrato'  => ['sometimes', 'in:base,interino,hora_clase,medio_tiempo'],
            'categoria'      => ['nullable', 'string', 'max:100'],
            'especialidades' => ['nullable', 'array'],
            'fecha_ingreso'  => ['nullable', 'date'],
            'titulos_academicos' => ['nullable', 'array'],
            'activo'         => ['sometimes', 'boolean'],
        ]);

        // Recalcular carga histórica
        $data['horas_frente_grupo_por_periodo'] = $this->calcularHorasPorPeriodo($docente->id);

        $ficha->update($data);

        return ApiResponse::success($ficha->fresh('docente'), 'Ficha actualizada.');
    }

    // GET /api/mi-ficha-docente  (docente ve/crea su propia ficha para editar su CV)
    public function miFicha(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasAnyRole(['docente', 'jefe_carrera', 'director_academico', 'admin', 'superadmin']), 403);

        $ficha = FichaDocente::firstOrCreate(
            ['docente_id' => $request->user()->id],
            ['tipo_contrato' => 'hora_clase']
        );

        return ApiResponse::success($ficha);
    }

    // PUT /api/mi-ficha-docente  (docente actualiza su propio CV — no los datos administrativos)
    public function actualizarMiCv(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasAnyRole(['docente', 'jefe_carrera', 'director_academico', 'admin', 'superadmin']), 403);

        $ficha = FichaDocente::firstOrCreate(
            ['docente_id' => $request->user()->id],
            ['tipo_contrato' => 'hora_clase']
        );

        $data = $request->validate([
            'semblanza'                        => ['nullable', 'string', 'max:2000'],
            'titulos_academicos'                => ['nullable', 'array'],
            'titulos_academicos.*.grado'         => ['required_with:titulos_academicos', 'string', 'max:150'],
            'titulos_academicos.*.institucion'   => ['nullable', 'string', 'max:200'],
            'titulos_academicos.*.anio'          => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'experiencia_laboral'               => ['nullable', 'array'],
            'experiencia_laboral.*.puesto'       => ['required_with:experiencia_laboral', 'string', 'max:150'],
            'experiencia_laboral.*.institucion'  => ['nullable', 'string', 'max:200'],
            'experiencia_laboral.*.fecha_inicio' => ['nullable', 'string', 'max:20'],
            'experiencia_laboral.*.fecha_fin'    => ['nullable', 'string', 'max:20'],
            'experiencia_laboral.*.descripcion'  => ['nullable', 'string', 'max:1000'],
            'cursos_capacitacion'                => ['nullable', 'array'],
            'cursos_capacitacion.*.nombre'       => ['required_with:cursos_capacitacion', 'string', 'max:200'],
            'cursos_capacitacion.*.institucion'  => ['nullable', 'string', 'max:200'],
            'cursos_capacitacion.*.fecha'        => ['nullable', 'string', 'max:20'],
            'cursos_capacitacion.*.horas'        => ['nullable', 'integer', 'min:0', 'max:2000'],
            'publicaciones'                      => ['nullable', 'array'],
            'publicaciones.*.titulo'             => ['required_with:publicaciones', 'string', 'max:250'],
            'publicaciones.*.medio'              => ['nullable', 'string', 'max:200'],
            'publicaciones.*.anio'               => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'publicaciones.*.url'                => ['nullable', 'string', 'max:500'],
        ]);

        $ficha->update(array_merge($data, ['cv_actualizado_en' => now()]));

        return ApiResponse::success($ficha->fresh(), 'CV actualizado.');
    }

    // Suma de horas semanales asignadas al docente por período
    private function calcularHorasPorPeriodo(string $docenteId): array
    {
        return CargaAcademica::where('docente_id', $docenteId)
            ->with('periodo:id,nombre')
            ->get()
            ->groupBy('periodo_id')
            ->map(fn($cargas, $periodoId) => [
                'periodo_id'   => $periodoId,
                'periodo'      => $cargas->first()->periodo?->nombre ?? $periodoId,
                'horas_semana' => $cargas->sum('horas_semana'),
            ])
            ->values()
            ->toArray();
    }
}
