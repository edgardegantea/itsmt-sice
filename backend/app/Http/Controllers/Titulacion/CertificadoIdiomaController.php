<?php

namespace App\Http\Controllers\Titulacion;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Titulacion\Models\CertificadoIdioma;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CertificadoIdiomaController extends Controller
{
    // GET /certificados-idioma
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $esAdmin = $user->hasAnyRole(['superadmin', 'admin', 'jefe_carrera', ...\App\Models\User::ROLES_DIRECTIVOS]);

        if (! $esAdmin) {
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno) {
                return ApiResponse::success([]);
            }
            return ApiResponse::success(
                CertificadoIdioma::with('validadoPor')
                    ->where('alumno_id', $alumno->id)
                    ->latest()
                    ->get()
            );
        }

        $carreraForzada = $user->carreraRestringida();
        $query = CertificadoIdioma::with(['alumno.user', 'alumno.carrera', 'validadoPor'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('validado') !== null, fn($q) => $q->where('validado', $request->boolean('validado')))
            ->when($request->query('alumno_id'), fn($q, $v) => $q->where('alumno_id', $v));

        return ApiResponse::success($query->latest()->paginate(20));
    }

    // POST /certificados-idioma  (S7-05 — alumno/admin registra)
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'alumno_id'               => ['nullable', 'uuid', 'exists:alumnos,id'],
            'idioma'                  => ['nullable', 'string', 'max:60'],
            'nivel'                   => ['nullable', 'string', 'max:20'],
            'institucion_certificadora' => ['required', 'string', 'max:200'],
            'fecha_expedicion'        => ['required', 'date'],
            'fecha_vencimiento'       => ['nullable', 'date', 'after:fecha_expedicion'],
            'url_documento'           => ['nullable', 'string', 'max:500'],
        ]);

        // Si es alumno, resuelve su propio alumno_id
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            $alumno = Alumno::where('user_id', $user->id)->first();
            if (! $alumno) {
                return ApiResponse::error('No se encontró el registro de alumno.', 404);
            }
            $data['alumno_id'] = $alumno->id;
        }

        if (empty($data['alumno_id'])) {
            return ApiResponse::error('Se requiere alumno_id.', 422);
        }

        $data['idioma'] ??= 'Inglés';
        $data['nivel']  ??= 'B1';

        $certificado = CertificadoIdioma::create($data);

        return ApiResponse::success(
            $certificado->load(['alumno.user', 'validadoPor']),
            'Certificado de idioma registrado.',
            201
        );
    }

    // PATCH /certificados-idioma/{id}/validar  (S7-05 — admin valida)
    public function validar(Request $request, CertificadoIdioma $certificadoIdioma): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'admin', ...\App\Models\User::ROLES_DIRECTIVOS])) {
            abort(403);
        }

        if ($certificadoIdioma->validado) {
            return ApiResponse::error('El certificado ya está validado.', 422);
        }

        $certificadoIdioma->update([
            'validado'    => true,
            'validado_por' => $user->id,
        ]);

        return ApiResponse::success(
            $certificadoIdioma->fresh(['alumno.user', 'validadoPor']),
            'Certificado de idioma validado como prerequisito de titulación (Cap. 14.4.1.2).'
        );
    }
}
