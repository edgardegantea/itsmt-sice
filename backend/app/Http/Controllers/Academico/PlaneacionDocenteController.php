<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\PlaneacionDocente;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class PlaneacionDocenteController extends Controller
{
    // GET /api/planeaciones-docentes  (admin/jefe_carrera lista)
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $planeaciones = PlaneacionDocente::with(['docente', 'periodo', 'cargaAcademica.materia', 'cargaAcademica.grupos.carrera'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('cargaAcademica.grupos', fn($gq) => $gq->where('carrera_id', $v))
            )
            ->when($request->query('estatus'),   fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
            ->when($request->query('carga_academica_id'), fn($q, $v) => $q->where('carga_academica_id', $v))
            ->latest()
            ->paginate(20);

        return ApiResponse::success($planeaciones);
    }

    // GET /api/planeaciones-docentes/{planeacion}  (detalle: dueño o roles revisores/consulta)
    public function show(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        $esDueño = $planeacionDocente->docente_id === $request->user()->id;
        if (! $esDueño && ! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            return ApiResponse::error('No tienes permiso para ver esta planeación.', 403);
        }

        $carreraForzada = $request->user()->carreraRestringida();
        if (! $esDueño && $carreraForzada) {
            $planeacionDocente->loadMissing('cargaAcademica.grupos');
            abort_if(
                $planeacionDocente->cargaAcademica?->grupos?->contains(fn($g) => $g->carrera_id !== $carreraForzada) ?? true,
                403,
                'Sin acceso a planeaciones de otras carreras.'
            );
        }

        return ApiResponse::success(
            $planeacionDocente->load(['docente', 'periodo', 'cargaAcademica.materia', 'cargaAcademica.grupos.carrera', 'revisadoPor'])
        );
    }

    // GET /api/planeaciones-docentes/mias  (docente ve las suyas)
    public function mias(Request $request): JsonResponse
    {
        $planeaciones = PlaneacionDocente::with(['periodo', 'cargaAcademica.materia', 'cargaAcademica.grupos'])
            ->where('docente_id', $request->user()->id)
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->latest()
            ->get();

        return ApiResponse::success($planeaciones);
    }

    // POST /api/planeaciones-docentes  (docente crea/actualiza borrador)
    public function store(Request $request): JsonResponse
    {
        // El frontend envía `competencias`/`calendarizacion` vía multipart/form-data
        // (junto con el archivo), donde solo existen strings — se serializan como JSON
        // en el cliente (ver academicoApi.savePlaneacion) y se decodifican aquí antes
        // de validar como array.
        foreach (['competencias', 'calendarizacion'] as $campoJson) {
            if ($request->has($campoJson) && is_string($request->input($campoJson))) {
                $decodificado = json_decode($request->input($campoJson), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$campoJson => $decodificado]);
                }
            }
        }

        $data = $request->validate([
            'carga_academica_id'    => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'periodo_id'            => ['required', 'uuid', 'exists:periodos,id'],
            'archivo'               => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
            'caracterizacion'       => ['nullable', 'string'],
            'intencion_didactica'   => ['nullable', 'string'],
            'competencia_asignatura' => ['nullable', 'string'],
            'competencias'          => ['nullable', 'array'],
            'fuentes_informacion'   => ['nullable', 'string'],
            'apoyos_didacticos'     => ['nullable', 'string'],
            'calendarizacion'       => ['nullable', 'array'],
            'fecha_entrega'         => ['nullable', 'date', function ($attr, $val, $fail) use ($request) {
                if (! $val) return;
                $periodo = Periodo::find($request->input('periodo_id'));
                if (! $periodo) return;
                $entrega = Carbon::parse($val);
                $inicio  = Carbon::parse($periodo->fecha_inicio);
                $dias    = 0;
                $cursor  = $entrega->copy()->addDay();
                while ($cursor->lte($inicio)) {
                    if ($cursor->isWeekday()) $dias++;
                    $cursor->addDay();
                }
                if ($dias < 3) {
                    $fail('La fecha de entrega debe ser al menos 3 días hábiles antes del inicio del periodo (TecNM PO-003 §3.4).');
                }
            }],
        ]);

        // Validar que la carga pertenece al docente autenticado
        $carga = CargaAcademica::findOrFail($data['carga_academica_id']);
        if ($request->user()->hasRole(['docente']) && $carga->docente_id !== $request->user()->id) {
            return ApiResponse::error('Esta carga académica no te pertenece.', 403);
        }

        unset($data['archivo']);
        if ($request->hasFile('archivo')) {
            $data['archivo_path']   = $request->file('archivo')->store('planeaciones_docentes', 'local');
            $data['archivo_nombre'] = $request->file('archivo')->getClientOriginalName();
        }

        $planeacion = PlaneacionDocente::updateOrCreate(
            ['carga_academica_id' => $data['carga_academica_id'], 'periodo_id' => $data['periodo_id']],
            array_merge($data, ['docente_id' => $carga->docente_id])
        );

        return ApiResponse::success(
            $planeacion->fresh(['cargaAcademica.materia', 'periodo']),
            'Planeación guardada.',
            201
        );
    }

    // Transiciones permitidas por rol en la cadena de aprobación (TecNM-AC-PO-003):
    // Docente -> Desarrollo Académico -> Jefatura de Carrera -> liberada, con devolución
    // a Docente en cualquiera de los dos pasos de revisión.
    private const TRANSICIONES = [
        'enviada_da' => [
            'devuelta_da' => ['desarrollo_academico', 'admin', 'superadmin'],
            'enviada_jc'  => ['desarrollo_academico', 'admin', 'superadmin'],
        ],
        'enviada_jc' => [
            'devuelta_jc' => ['jefe_carrera', 'admin', 'superadmin'],
            'liberada'    => ['jefe_carrera', 'admin', 'superadmin'],
        ],
    ];

    // POST /api/planeaciones-docentes/{planeacion}/enviar  (docente envía/reenvía a Desarrollo Académico)
    public function enviar(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if ($planeacionDocente->docente_id !== $request->user()->id) {
            return ApiResponse::error('No tienes permiso para enviar esta planeación.', 403);
        }

        if (!in_array($planeacionDocente->estatus, ['borrador', 'devuelta_da', 'devuelta_jc'])) {
            return ApiResponse::error('Solo puedes enviar planeaciones en borrador o devueltas.', 422);
        }

        // Cualquier reenvío (venga de Desarrollo Académico o de Jefatura de Carrera) reinicia
        // la cadena pasando primero por Desarrollo Académico.
        $planeacionDocente->update([
            'estatus'                => 'enviada_da',
            'entregada_en'           => now(),
            'observaciones_revision' => null,
            'observaciones_campos'   => null,
        ]);
        $planeacionDocente->load(['cargaAcademica.materia', 'cargaAcademica.grupos.carrera', 'docente', 'periodo']);

        // Notificar a Desarrollo Académico (institucional, no acotado por carrera)
        $revisores = User::role('desarrollo_academico')->get();
        foreach ($revisores as $revisor) {
            Mail::to($revisor->email)->queue(new \App\Mail\PlaneacionDocenteEntregadaMail($planeacionDocente));
        }

        return ApiResponse::success($planeacionDocente, 'Planeación enviada a Desarrollo Académico.');
    }

    // PATCH /api/planeaciones-docentes/{planeacion}/estatus  (Desarrollo Académico / Jefatura de Carrera revisan)
    public function cambiarEstatus(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        $data = $request->validate([
            'estatus'                             => ['required', 'in:devuelta_da,enviada_jc,devuelta_jc,liberada'],
            'observaciones_revision'               => ['nullable', 'string', 'max:1000'],
            'observaciones_campos'                 => ['nullable', 'array'],
            'observaciones_campos.*.id'            => ['required_with:observaciones_campos', 'string'],
            'observaciones_campos.*.seccion'       => ['required_with:observaciones_campos', 'in:caracterizacion,intencion_didactica,competencia_asignatura,especifica,dosificacion,calendarizacion'],
            'observaciones_campos.*.unidad'        => ['nullable', 'integer'],
            'observaciones_campos.*.categoria'     => ['nullable', 'string'],
            'observaciones_campos.*.texto'         => ['required_with:observaciones_campos', 'string', 'max:1000'],
        ]);

        $rolesPermitidos = self::TRANSICIONES[$planeacionDocente->estatus][$data['estatus']] ?? null;
        if (! $rolesPermitidos) {
            return ApiResponse::error(
                "Transición no permitida: {$planeacionDocente->estatus} → {$data['estatus']}.",
                422
            );
        }

        if (! $request->user()->hasAnyRole($rolesPermitidos)) {
            return ApiResponse::error('No tienes permiso para realizar esta transición.', 403);
        }

        // Un jefe_carrera (no admin/superadmin) solo puede actuar sobre planeaciones de su propia carrera.
        if ($request->user()->hasRole('jefe_carrera') && ! $request->user()->hasAnyRole(['admin', 'superadmin'])) {
            $planeacionDocente->loadMissing('cargaAcademica.grupos');
            $carreraForzada = $request->user()->carrera_id;
            abort_if(
                $planeacionDocente->cargaAcademica?->grupos?->contains(fn($g) => $g->carrera_id !== $carreraForzada) ?? true,
                403,
                'Sin acceso a planeaciones de otras carreras.'
            );
        }

        if (in_array($data['estatus'], ['devuelta_da', 'devuelta_jc'])
            && empty($data['observaciones_revision'])
            && empty($data['observaciones_campos'])
        ) {
            return ApiResponse::error('Debes indicar al menos una observación (general o anclada a una sección) al devolver una planeación.', 422);
        }

        $planeacionDocente->update([
            'estatus'                => $data['estatus'],
            'observaciones_revision' => $data['observaciones_revision'] ?? null,
            'observaciones_campos'   => $data['observaciones_campos'] ?? null,
            'revisado_por'           => $request->user()->id,
            'revisado_en'            => now(),
        ]);

        return ApiResponse::success($planeacionDocente->load(['cargaAcademica.materia', 'revisadoPor']), 'Estatus actualizado.');
    }

    // GET /api/planeaciones-docentes/{planeacion}/archivo  (descarga del archivo entregado)
    public function archivo(Request $request, PlaneacionDocente $planeacionDocente): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $esDueño = $planeacionDocente->docente_id === $request->user()->id;
        if (! $esDueño && ! $request->user()->hasAnyRole(['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'jefe_carrera'])) {
            abort(403, 'No tienes permiso para descargar este archivo.');
        }

        $carreraForzada = $request->user()->carreraRestringida();
        if (! $esDueño && $carreraForzada) {
            $planeacionDocente->loadMissing('cargaAcademica.grupos');
            abort_if(
                $planeacionDocente->cargaAcademica?->grupos?->contains(fn($g) => $g->carrera_id !== $carreraForzada) ?? true,
                403,
                'Sin acceso a planeaciones de otras carreras.'
            );
        }

        abort_if(! $planeacionDocente->archivo_path, 404, 'Esta planeación no tiene archivo adjunto.');

        return \Illuminate\Support\Facades\Storage::disk('local')->download(
            $planeacionDocente->archivo_path,
            $planeacionDocente->archivo_nombre ?? 'planeacion.pdf'
        );
    }
}
