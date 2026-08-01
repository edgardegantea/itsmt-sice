<?php

namespace App\Http\Controllers\Vinculacion;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Vinculacion\Models\ServicioSocial;
use App\Domains\Vinculacion\Services\PrerequisitosResidenciaService;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Mail\ServicioSocialEstatusActualizadoMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ServicioSocialController extends Controller
{
    public function __construct(private PrerequisitosResidenciaService $prerequisitos) {}

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
        $prerequisito = $this->prerequisitos->porcentajeCreditos($alumno);
        if ($prerequisito['porcentaje'] < 70) {
            return ApiResponse::error(
                "Debes tener al menos 70% de créditos acreditados para solicitar Servicio Social. Tienes {$prerequisito['porcentaje']}% ({$prerequisito['acreditados']}/{$prerequisito['total']} créditos).",
                422
            );
        }

        $data = $request->validate([
            'empresa'          => ['required', 'string', 'max:200'],
            'responsable'      => ['nullable', 'string', 'max:150'],
            'fecha_inicio'     => ['nullable', 'date'],
            'documentos'       => ['nullable', 'array'],
            'carta_aceptacion' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
        ]);

        // Un alumno solo puede tener una solicitud de SS activa
        $existente = ServicioSocial::where('alumno_id', $alumno->id)
            ->whereNotIn('estatus', ['rechazado'])
            ->first();
        if ($existente) {
            return ApiResponse::error('Ya tienes una solicitud de Servicio Social activa.', 422);
        }

        $cartaAceptacionPath = $request->file('carta_aceptacion')->store('servicio-social', 'public');
        unset($data['carta_aceptacion']);

        $ss = ServicioSocial::create(array_merge($data, [
            'alumno_id'             => $alumno->id,
            'estatus'               => 'solicitado',
            'carta_aceptacion_path' => $cartaAceptacionPath,
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
        $servicioSocial = $servicioSocial->fresh(['alumno.user', 'alumno.carrera']);

        $email = $servicioSocial->alumno?->user?->email;
        if ($email) {
            try {
                Mail::to($email)->queue(new ServicioSocialEstatusActualizadoMail($servicioSocial));
            } catch (\Throwable $e) {
                Log::warning('No se pudo notificar el cambio de estatus de Servicio Social al alumno.', [
                    'servicio_social_id' => $servicioSocial->id,
                    'error'              => $e->getMessage(),
                ]);
            }
        }

        return ApiResponse::success($servicioSocial, 'Estatus actualizado.');
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

        return ApiResponse::success($this->prerequisitos->verificar($alumno));
    }
}
