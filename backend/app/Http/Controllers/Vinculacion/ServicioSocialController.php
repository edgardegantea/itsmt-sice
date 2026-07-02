<?php

namespace App\Http\Controllers\Vinculacion;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\MallaCurricular;
use App\Domains\Vinculacion\Models\ServicioSocial;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServicioSocialController extends Controller
{
    // GET /servicio-social  (admin/jefe_carrera lista; alumno ve el suyo)
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS]);

        if (! $esAdmin) {
            // Alumno solo puede ver su propio registro
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno) {
                return ApiResponse::success([]);
            }
            $query = ServicioSocial::with(['alumno.user', 'alumno.carrera'])
                ->where('alumno_id', $alumno->id);
            return ApiResponse::success($query->latest()->paginate(20));
        }

        $carreraForzada = $user->carreraRestringida();

        $query = ServicioSocial::with(['alumno.user', 'alumno.carrera'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('estatus'),    fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('alumno_id'),  fn($q, $v) => $q->where('alumno_id', $v))
            ->when($request->query('carrera_id') && ! $carreraForzada,
                fn($q) => $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $request->query('carrera_id')))
            );

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /servicio-social  (alumno registra SS)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Obtener alumno del usuario autenticado
        $alumno = Alumno::where('user_id', $user->id)->first();
        if (! $alumno) {
            return ApiResponse::error('No se encontró el registro de alumno.', 404);
        }

        // Validar prerrequisito: ≥70% créditos (política 3.4.5 PO-004)
        $prerequisito = $this->calcularPorcentajeCreditos($alumno);
        if ($prerequisito['porcentaje'] < 70) {
            return ApiResponse::error(
                "Debes tener al menos 70% de créditos acreditados para solicitar Servicio Social. Tienes {$prerequisito['porcentaje']}% ({$prerequisito['acreditados']}/{$prerequisito['total']} créditos).",
                422
            );
        }

        $data = $request->validate([
            'empresa'     => ['required', 'string', 'max:200'],
            'responsable' => ['nullable', 'string', 'max:150'],
            'fecha_inicio'=> ['nullable', 'date'],
            'documentos'  => ['nullable', 'array'],
        ]);

        // Un alumno solo puede tener una solicitud de SS activa
        $existente = ServicioSocial::where('alumno_id', $alumno->id)
            ->whereNotIn('estatus', ['rechazado'])
            ->first();
        if ($existente) {
            return ApiResponse::error('Ya tienes una solicitud de Servicio Social activa.', 422);
        }

        $ss = ServicioSocial::create(array_merge($data, [
            'alumno_id' => $alumno->id,
            'estatus'   => 'solicitado',
        ]));

        return ApiResponse::success($ss->load(['alumno.user', 'alumno.carrera']), 'Solicitud de Servicio Social registrada.', 201);
    }

    // PATCH /servicio-social/{ss}/estatus  (admin actualiza)
    public function actualizarEstatus(Request $request, ServicioSocial $servicioSocial): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        $carreraForzada = $user->carreraRestringida();
        if ($carreraForzada && $servicioSocial->alumno?->carrera_id !== $carreraForzada) {
            return ApiResponse::error('No tienes acceso a este registro.', 403);
        }

        $data = $request->validate([
            'estatus'          => ['required', 'in:aprobado,rechazado,en_curso,acreditado'],
            'horas_acumuladas' => ['nullable', 'integer', 'min:0'],
            'nivel_desempeno'  => ['nullable', 'in:excelente,notable,bueno,suficiente,insuficiente'],
            'fecha_fin'        => ['nullable', 'date'],
        ]);

        // Al acreditar, calcular créditos otorgados (mínimo 480 horas → 10 créditos TecNM)
        if ($data['estatus'] === 'acreditado' && isset($data['horas_acumuladas']) && $data['horas_acumuladas'] >= 480) {
            $data['creditos_otorgados'] = 10;
        }

        $servicioSocial->update($data);

        return ApiResponse::success($servicioSocial->fresh(['alumno.user', 'alumno.carrera']), 'Estatus actualizado.');
    }

    // GET /alumnos/{alumno}/verificar-prerequisitos-residencia  (S6-06)
    public function verificarPrerequisitosResidencia(Request $request, Alumno $alumno): JsonResponse
    {
        if (! $request->user()->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            // Alumno solo puede verificar los suyos
            $propioAlumnoId = Alumno::where('user_id', $request->user()->id)->value('id');
            if ($propioAlumnoId !== $alumno->id) {
                abort(403);
            }
        }

        $ssAcreditado = ServicioSocial::where('alumno_id', $alumno->id)
            ->where('estatus', 'acreditado')
            ->exists();

        $acCompletadas = \App\Domains\Calidad\Models\ActividadComplementaria::where('alumno_id', $alumno->id)
            ->where('estatus', 'validada')
            ->exists();

        $creditos = $this->calcularPorcentajeCreditos($alumno);
        $dentroLimite = $alumno->semestre_actual <= 12;

        return ApiResponse::success([
            'ss_acreditado'           => $ssAcreditado,
            'ac_completadas'          => $acCompletadas,
            'porcentaje_creditos'     => $creditos['porcentaje'],
            'creditos_acreditados'    => $creditos['acreditados'],
            'creditos_totales'        => $creditos['total'],
            'dentro_limite_semestres' => $dentroLimite,
            'semestre_actual'         => $alumno->semestre_actual,
            'puede_solicitar_rp'      => $ssAcreditado && $acCompletadas && $creditos['porcentaje'] >= 80 && $dentroLimite,
        ]);
    }

    private function calcularPorcentajeCreditos(Alumno $alumno): array
    {
        $total = MallaCurricular::where('mallas_curriculares.carrera_id', $alumno->carrera_id)
            ->join('materias', 'mallas_curriculares.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        if ($total === 0) {
            return ['porcentaje' => 0, 'acreditados' => 0, 'total' => 0];
        }

        $acreditados = \App\Domains\Academico\Models\Calificacion::where('calificaciones.alumno_id', $alumno->id)
            ->where('calificaciones.acreditado', true)
            ->join('cargas_academicas', 'calificaciones.grupo_id', '=', 'cargas_academicas.grupo_id')
            ->join('materias', 'cargas_academicas.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        $porcentaje = round(($acreditados / $total) * 100, 1);

        return ['porcentaje' => $porcentaje, 'acreditados' => (int) $acreditados, 'total' => (int) $total];
    }
}
