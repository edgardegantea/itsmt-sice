<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\AlertaInasistencia;
use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Asistencia;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\SesionClase;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Mail\ListaAsistenciaBlancoMail;
use App\Mail\ReporteAsistenciaGrupoMail;
use App\Mail\ResumenSesionAsistenciaMail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SesionClaseController extends Controller
{
    // Roles con permiso de administrar el envío masivo de listas/reportes por correo —
    // debe coincidir con ROLES_GESTION_ENVIO en AsistenciasPage.tsx (frontend).
    private const ROLES_GESTION_ENVIO = ['superadmin', 'admin', 'jefe_carrera', 'director_academico',
        'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'];

    // GET /api/sesiones-clase
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id'           => 'nullable|uuid',
            'periodo_id'         => 'nullable|uuid',
            'carga_academica_id' => 'nullable|uuid',
            'fecha'              => 'nullable|date',
        ]);

        $user = $request->user();

        // Se precarga 'asistencias' porque el pase de lista usa este listado para saber
        // qué ya se guardó por alumno en cada sesión — sin esta relación, el frontend no
        // tiene forma de distinguir "sin capturar" de "ya guardado" y siempre mostraba
        // a todos como ausentes al recargar, aunque el guardado en BD sí funcionara.
        $query = SesionClase::with(['grupo.carrera', 'grupo.periodo', 'cargaAcademica.materia', 'docente', 'asistencias'])
            ->orderBy('fecha', 'desc')
            ->orderBy('hora_inicio', 'desc');

        if ($request->filled('grupo_id')) {
            $query->where('grupo_id', $request->grupo_id);
        }

        if ($request->filled('carga_academica_id')) {
            $query->where('carga_academica_id', $request->carga_academica_id);
        }

        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->fecha);
        }

        if ($user->hasRole('docente')) {
            $query->where('docente_id', $user->id);
        }

        if ($request->filled('periodo_id')) {
            $query->whereHas('grupo', fn ($q) => $q->where('periodo_id', $request->periodo_id));
        }

        return ApiResponse::success($query->paginate(30));
    }

    // POST /api/sesiones-clase
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'grupo_id'           => 'required|uuid|exists:grupos,id',
            'carga_academica_id' => 'nullable|uuid|exists:cargas_academicas,id',
            'fecha'       => 'required|date|before_or_equal:today',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin'    => 'required|date_format:H:i|after:hora_inicio',
            'tema'        => 'nullable|string|max:255',
            'asistencias' => 'sometimes|array',
            'asistencias.*.alumno_id' => 'required|uuid|exists:users,id',
            'asistencias.*.estatus'   => ['required', Rule::in(['presente', 'ausente', 'retardo', 'justificado'])],
            'asistencias.*.observacion' => 'nullable|string|max:255',
        ]);

        // Reutiliza la sesión existente para este grupo+materia+fecha en vez de crear un
        // duplicado — sin esto, cada "Guardar asistencia" del mismo día insertaba una
        // sesión nueva y el frontend podía terminar mostrando una copia sin los últimos
        // cambios, dando la impresión de que la asistencia no se guardaba.
        // carga_academica_id es nullable (algunos flujos de captura no lo envían), así que
        // se incluye también docente_id en la búsqueda: de lo contrario dos sesiones sin
        // carga_academica_id para el mismo grupo+fecha pero de materias/docentes distintos
        // coincidirían con el mismo registro y una sobrescribiría silenciosamente a la otra.
        $sesion = SesionClase::firstOrNew([
            'grupo_id'           => $data['grupo_id'],
            'carga_academica_id' => $data['carga_academica_id'] ?? null,
            'docente_id'         => $request->user()->id,
            'fecha'              => $data['fecha'],
        ]);
        $sesion->fill([
            'docente_id'  => $request->user()->id,
            'hora_inicio' => $data['hora_inicio'],
            'hora_fin'    => $data['hora_fin'],
            'tema'        => $data['tema'] ?? $sesion->tema,
        ]);
        $sesion->save();

        if (!empty($data['asistencias'])) {
            foreach ($data['asistencias'] as $a) {
                Asistencia::updateOrCreate(
                    ['sesion_id' => $sesion->id, 'alumno_id' => $a['alumno_id']],
                    ['estatus' => $a['estatus'], 'observacion' => $a['observacion'] ?? null]
                );
            }
            $this->checkAndGenerateAlertas($sesion->grupo_id);
        }

        return ApiResponse::success($sesion->load(['grupo', 'cargaAcademica.materia', 'docente', 'asistencias.alumno']), 'Sesión registrada', 201);
    }

    // GET /api/sesiones-clase/{id}
    public function show(SesionClase $sesionClase): JsonResponse
    {
        return ApiResponse::success($sesionClase->load(['grupo.carrera', 'cargaAcademica.materia', 'docente', 'asistencias.alumno']));
    }

    // PATCH /api/sesiones-clase/{id}/asistencia
    public function actualizarAsistencia(Request $request, SesionClase $sesionClase): JsonResponse
    {
        $data = $request->validate([
            'asistencias'                 => 'required|array',
            'asistencias.*.alumno_id'     => 'required|uuid|exists:users,id',
            'asistencias.*.estatus'       => ['required', Rule::in(['presente', 'ausente', 'retardo', 'justificado'])],
            'asistencias.*.observacion'   => 'nullable|string|max:255',
        ]);

        foreach ($data['asistencias'] as $a) {
            Asistencia::updateOrCreate(
                ['sesion_id' => $sesionClase->id, 'alumno_id' => $a['alumno_id']],
                ['estatus' => $a['estatus'], 'observacion' => $a['observacion'] ?? null]
            );
        }

        $this->checkAndGenerateAlertas($sesionClase->grupo_id);

        return ApiResponse::success($sesionClase->fresh(['grupo', 'docente', 'asistencias.alumno']));
    }

    // POST /api/sesiones-clase/{id}/generar-checkin
    public function generarCheckin(Request $request, SesionClase $sesionClase): JsonResponse
    {
        if ($sesionClase->docente_id !== $request->user()->id && !$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $sesionClase->update([
            'codigo_checkin'    => strtoupper(Str::random(6)),
            'checkin_expira_en' => now()->addMinutes(30),
        ]);

        return ApiResponse::success($sesionClase->fresh(['grupo', 'cargaAcademica.materia', 'docente']));
    }

    // POST /api/sesiones-clase/{id}/checkin — el alumno confirma su propia asistencia
    public function checkin(Request $request, SesionClase $sesionClase): JsonResponse
    {
        // "Modo día de examen": si la fecha de la sesión tiene el modo activo, la foto
        // deja de ser opcional — se exige como verificación reforzada solo ese día.
        $modoExamenActivo = \App\Domains\Academico\Models\ModoExamen::activoHoy($sesionClase->fecha?->toDateString());

        $data = $request->validate([
            'codigo' => 'required|string',
            // Evidencia opcional (obligatoria en modo examen), NO biometría: solo una
            // foto adjunta al registro, disuasoria contra que alguien pase lista por
            // otro compañero — no hay comparación ni reconocimiento facial de ningún tipo.
            'foto_evidencia' => [$modoExamenActivo ? 'required' : 'nullable', 'string'], // data URL base64
            'geo_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'geo_lng' => ['nullable', 'numeric', 'between:-180,180'],
        ], [
            'foto_evidencia.required' => 'Hoy es día de examen: la foto de evidencia es obligatoria para confirmar tu asistencia.',
        ]);

        if (!$sesionClase->codigo_checkin || strtoupper($data['codigo']) !== $sesionClase->codigo_checkin) {
            return ApiResponse::error('Código inválido.', 422);
        }

        if ($sesionClase->checkin_expira_en && now()->greaterThan($sesionClase->checkin_expira_en)) {
            return ApiResponse::error('El código ha expirado.', 422);
        }

        $userId = $request->user()->id;

        $perteneceAlGrupo = DB::table('alumno_grupo')
            ->join('alumnos', 'alumnos.id', '=', 'alumno_grupo.alumno_id')
            ->where('alumno_grupo.grupo_id', $sesionClase->grupo_id)
            ->where('alumnos.user_id', $userId)
            ->exists();

        if (!$perteneceAlGrupo) {
            return ApiResponse::error('No perteneces a este grupo.', 403);
        }

        $fotoPath = null;
        if (! empty($data['foto_evidencia']) && preg_match('/^data:image\/(jpe?g|png|webp);base64,/', $data['foto_evidencia'])) {
            $contenido = base64_decode(preg_replace('/^data:image\/\w+;base64,/', '', $data['foto_evidencia']));
            if ($contenido !== false && strlen($contenido) <= 2 * 1024 * 1024) { // tope 2MB
                $fotoPath = "checkin-evidencia/{$sesionClase->id}/{$userId}-" . now()->format('YmdHis') . '.jpg';
                \Illuminate\Support\Facades\Storage::disk('public')->put($fotoPath, $contenido);
            }
        }

        Asistencia::updateOrCreate(
            ['sesion_id' => $sesionClase->id, 'alumno_id' => $userId],
            array_filter([
                'estatus' => 'presente',
                'foto_evidencia_path' => $fotoPath,
                'geo_lat' => $data['geo_lat'] ?? null,
                'geo_lng' => $data['geo_lng'] ?? null,
            ], fn ($v) => $v !== null)
        );

        return ApiResponse::success(null, 'Asistencia registrada.');
    }

    // POST /api/sesiones-clase/{id}/enviar-resumen
    public function enviarResumenSesion(Request $request, SesionClase $sesionClase): JsonResponse
    {
        if ($sesionClase->docente_id !== $request->user()->id && !$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $sesionClase->load(['docente', 'grupo', 'asistencias.alumno']);

        if (!$sesionClase->docente?->email) {
            return ApiResponse::error('El docente no tiene correo registrado.', 422);
        }

        Mail::to($sesionClase->docente->email)->queue(new ResumenSesionAsistenciaMail($sesionClase));

        return ApiResponse::success(null, 'Resumen enviado por correo.');
    }

    // POST /api/cargas-academicas/{id}/asistencia/enviar-lista-blanco
    public function enviarListaBlanco(Request $request, CargaAcademica $cargaAcademica): JsonResponse
    {
        if (!$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        if (!$this->enviarCorreoListaBlanco($cargaAcademica)) {
            return ApiResponse::error('El docente no tiene correo registrado.', 422);
        }

        return ApiResponse::success(null, 'Lista enviada por correo.');
    }

    // POST /api/cargas-academicas/{id}/asistencia/enviar-reporte
    public function enviarReporteGrupo(Request $request, CargaAcademica $cargaAcademica): JsonResponse
    {
        if (!$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        if (!$this->enviarCorreoReporte($cargaAcademica)) {
            return ApiResponse::error('El docente no tiene correo registrado.', 422);
        }

        return ApiResponse::success(null, 'Reporte enviado por correo.');
    }

    // GET /api/cargas-academicas/{id}/asistencia/lista-blanco/pdf
    public function listaBlancoPdf(Request $request, CargaAcademica $cargaAcademica)
    {
        if (!$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            abort(403);
        }

        return response($this->pdfListaBlanco($cargaAcademica)->output(), 200, ['Content-Type' => 'application/pdf']);
    }

    private function validarRangoFechas(Request $request): array
    {
        $data = $request->validate([
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        return [$data['desde'] ?? null, $data['hasta'] ?? null];
    }

    // GET /api/cargas-academicas/{id}/asistencia/reporte/pdf?desde=&hasta=
    public function reportePdf(Request $request, CargaAcademica $cargaAcademica)
    {
        if (!$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            abort(403);
        }

        [$desde, $hasta] = $this->validarRangoFechas($request);
        [$pdf] = $this->construirPdfReporte($cargaAcademica, $desde, $hasta);

        return response($pdf->output(), 200, ['Content-Type' => 'application/pdf']);
    }

    // GET /api/cargas-academicas/{id}/asistencia/reporte/excel?desde=&hasta=
    public function reporteExcel(Request $request, CargaAcademica $cargaAcademica)
    {
        if (!$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            abort(403);
        }

        [$desde, $hasta] = $this->validarRangoFechas($request);
        $cargaAcademica->loadMissing(['docente', 'materia', 'grupos']);
        [$resumenAlumnos, $totalSesiones] = $this->resumenAsistenciaCarga($cargaAcademica, $desde, $hasta);

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\ReporteAsistenciaCargaExport($cargaAcademica, $resumenAlumnos, $totalSesiones, $desde, $hasta),
            'reporte_asistencia.xlsx'
        );
    }

    // POST /api/admin/asistencias/enviar-masivo
    public function enviarMasivo(Request $request): JsonResponse
    {
        if (!$request->user()->hasAnyRole(self::ROLES_GESTION_ENVIO)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $data = $request->validate([
            'periodo_id' => 'required|uuid|exists:periodos,id',
            'tipo'       => ['required', Rule::in(['blanco', 'reporte'])],
        ]);

        $cargas = CargaAcademica::with(['docente', 'materia', 'grupos.carrera', 'periodo'])
            ->where('periodo_id', $data['periodo_id'])
            ->get();

        $enviados  = 0;
        $sinCorreo = 0;

        foreach ($cargas as $carga) {
            $ok = $data['tipo'] === 'blanco'
                ? $this->enviarCorreoListaBlanco($carga)
                : $this->enviarCorreoReporte($carga);

            $ok ? $enviados++ : $sinCorreo++;
        }

        return ApiResponse::success(
            ['enviados' => $enviados, 'sin_correo' => $sinCorreo],
            'Envío masivo completado.'
        );
    }

    // GET /api/grupos/{grupo}/reporte-asistencia
    public function reporteAsistenciaGrupo(Request $request, Grupo $grupo): JsonResponse
    {
        $sesiones = SesionClase::with(['asistencias.alumno'])
            ->where('grupo_id', $grupo->id)
            ->orderBy('fecha')
            ->get();

        $totalSesiones = $sesiones->count();

        // Compile per-student summary
        $alumnoStats = [];
        foreach ($sesiones as $sesion) {
            foreach ($sesion->asistencias as $a) {
                $id = $a->alumno_id;
                if (!isset($alumnoStats[$id])) {
                    $alumnoStats[$id] = [
                        'alumno_id'   => $id,
                        'nombre'      => $a->alumno->name ?? $id,
                        'presentes'   => 0,
                        'ausentes'    => 0,
                        'retardos'    => 0,
                        'justificados'=> 0,
                    ];
                }
                $alumnoStats[$id][$a->estatus === 'presente' ? 'presentes'
                    : ($a->estatus === 'ausente' ? 'ausentes'
                    : ($a->estatus === 'retardo' ? 'retardos' : 'justificados'))]++;
            }
        }

        foreach ($alumnoStats as &$stats) {
            $inasistenciasEfectivas = $stats['ausentes'] + ($stats['retardos'] * 0.5);
            $stats['porcentaje_inasistencia'] = $totalSesiones > 0
                ? round(($inasistenciasEfectivas / $totalSesiones) * 100, 2)
                : 0;
        }

        return ApiResponse::success([
            'grupo'           => $grupo->load('carrera', 'periodo'),
            'total_sesiones'  => $totalSesiones,
            'sesiones'        => $sesiones,
            'resumen_alumnos' => array_values($alumnoStats),
        ]);
    }

    // GET /api/alumnos/{alumno}/asistencia
    public function asistenciaAlumno(Request $request, string $alumnoId): JsonResponse
    {
        $registros = Asistencia::with(['sesion.grupo.carrera', 'sesion.grupo.periodo'])
            ->where('alumno_id', $alumnoId)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($registros);
    }

    // GET /api/reportes/carga-academica
    public function reporteCargaAcademica(Request $request): JsonResponse
    {
        $request->validate(['periodo_id' => 'nullable|uuid|exists:periodos,id']);

        $periodoId = $request->query('periodo_id');

        $docentes = \App\Models\User::role('docente')
            ->with(['cargas' => function ($q) use ($periodoId) {
                if ($periodoId) {
                    $q->where('periodo_id', $periodoId);
                }
                $q->with(['grupos', 'materia']);
            }, 'fichaDocente'])
            ->get()
            ->map(function ($docente) {
                $cargas         = $docente->cargas;
                $totalGrupos    = $cargas->count();
                $totalHoras     = $cargas->sum(fn ($c) => $c->horas_semana ?? 0);
                $materias       = $cargas->map(fn ($c) => $c->materia?->nombre)->filter()->unique()->values();

                return [
                    'docente_id'        => $docente->id,
                    'nombre'            => $docente->name,
                    'email'             => $docente->email,
                    'tipo_contrato'     => $docente->fichaDocente?->tipo_contrato,
                    'total_grupos'      => $totalGrupos,
                    'total_horas_semana'=> $totalHoras,
                    'materias'          => $materias,
                ];
            });

        return ApiResponse::success($docentes);
    }

    private function checkAndGenerateAlertas(string $grupoId): void
    {
        $sesiones = SesionClase::where('grupo_id', $grupoId)->pluck('id');
        $totalSesiones = $sesiones->count();

        if ($totalSesiones === 0) {
            return;
        }

        // alumno_grupo.alumno_id → alumnos.id; we need users.id for asistencias and alertas
        $alumnoRows = \DB::table('alumno_grupo')
            ->join('alumnos', 'alumnos.id', '=', 'alumno_grupo.alumno_id')
            ->where('alumno_grupo.grupo_id', $grupoId)
            ->where('alumno_grupo.activo', true)
            ->select('alumnos.user_id as user_id')
            ->get();

        foreach ($alumnoRows as $row) {
            $userId = $row->user_id;

            $ausencias = Asistencia::whereIn('sesion_id', $sesiones)
                ->where('alumno_id', $userId)
                ->whereIn('estatus', ['ausente', 'retardo'])
                ->get();

            $inasistenciasEfectivas = $ausencias->sum(fn ($a) => $a->estatus === 'retardo' ? 0.5 : 1);
            $porcentaje = ($inasistenciasEfectivas / $totalSesiones) * 100;

            if ($porcentaje >= 25) {
                AlertaInasistencia::updateOrCreate(
                    ['alumno_id' => $userId, 'grupo_id' => $grupoId],
                    ['porcentaje_inasistencia' => round($porcentaje, 2)]
                );
            }
        }
    }

    /** Devuelve false (en vez de lanzar) cuando el docente no tiene correo, para que el
     * envío masivo pueda seguir con las demás cargas sin abortar todo el lote. */
    private function enviarCorreoListaBlanco(CargaAcademica $carga): bool
    {
        $carga->loadMissing(['docente', 'materia', 'grupos.carrera', 'periodo']);

        if (!$carga->docente?->email) {
            return false;
        }

        $pdfBinario = $this->pdfListaBlanco($carga)->output();
        Mail::to($carga->docente->email)->queue(new ListaAsistenciaBlancoMail($carga, $pdfBinario));

        return true;
    }

    private function enviarCorreoReporte(CargaAcademica $carga): bool
    {
        $carga->loadMissing(['docente', 'materia', 'grupos.carrera', 'periodo']);

        if (!$carga->docente?->email) {
            return false;
        }

        [, $resumenAlumnos, $totalSesiones] = $this->construirPdfReporte($carga);
        Mail::to($carga->docente->email)->queue(new ReporteAsistenciaGrupoMail($carga, $resumenAlumnos, $totalSesiones));

        return true;
    }

    private function pdfListaBlanco(CargaAcademica $carga)
    {
        $carga->loadMissing(['docente', 'materia', 'grupos.carrera', 'periodo']);
        $grupo = $carga->grupos->first();

        return Pdf::loadView('pdfs.lista_asistencia_grupo', [
            'carrera'     => $grupo?->carrera,
            'periodo'     => $carga->periodo,
            'materia'     => $carga->materia,
            'docente'     => $carga->docente,
            'gruposClave' => $carga->grupos->pluck('clave')->implode(', '),
            'alumnos'     => $this->alumnosDeCarga($carga),
        ])->setPaper('letter', 'landscape');
    }

    /** @return array{0: \Barryvdh\DomPDF\PDF, 1: array, 2: int} */
    private function construirPdfReporte(CargaAcademica $carga, ?string $desde = null, ?string $hasta = null): array
    {
        $carga->loadMissing(['docente', 'materia', 'grupos.carrera.coordinador', 'periodo']);
        $grupo = $carga->grupos->first();
        [$resumenAlumnos, $totalSesiones] = $this->resumenAsistenciaCarga($carga, $desde, $hasta);

        $pdf = Pdf::loadView('pdfs.reporte_asistencia_grupo', [
            'carrera'      => $grupo?->carrera,
            'periodo'      => $carga->periodo,
            'materia'      => $carga->materia,
            'docente'      => $carga->docente,
            'jefeCarrera'  => $grupo?->carrera?->coordinador,
            'gruposClave'  => $carga->grupos->pluck('clave')->implode(', '),
            'totalSesiones'=> $totalSesiones,
            'alumnos'      => $resumenAlumnos,
            'rangoFechas'  => $desde || $hasta ? trim(($desde ?? '…') . ' – ' . ($hasta ?? '…')) : null,
        ])->setPaper('letter', 'portrait');

        return [$pdf, $resumenAlumnos, $totalSesiones];
    }

    /** Estadísticas de asistencia por alumno para las sesiones de esta carga específica
     * (no de todo el grupo — un grupo puede tener varias materias con sus propias sesiones),
     * opcionalmente acotadas a un rango de fechas para generar reportes parciales (p. ej. por parcial). */
    private function resumenAsistenciaCarga(CargaAcademica $carga, ?string $desde = null, ?string $hasta = null): array
    {
        $sesiones = SesionClase::with('asistencias')
            ->where('carga_academica_id', $carga->id)
            ->when($desde, fn ($q) => $q->whereDate('fecha', '>=', $desde))
            ->when($hasta, fn ($q) => $q->whereDate('fecha', '<=', $hasta))
            ->get();
        $totalSesiones = $sesiones->count();

        $stats = [];
        foreach ($this->alumnosDeCarga($carga) as $a) {
            $stats[$a->user_id] = [
                'alumno_id'      => $a->user_id,
                'numero_control' => $a->numero_control,
                'nombre'       => $a->nombre_completo,
                'presentes'    => 0,
                'ausentes'     => 0,
                'retardos'     => 0,
                'justificados' => 0,
            ];
        }

        $campoPorEstatus = ['presente' => 'presentes', 'ausente' => 'ausentes', 'retardo' => 'retardos', 'justificado' => 'justificados'];
        foreach ($sesiones as $sesion) {
            foreach ($sesion->asistencias as $asis) {
                if (!isset($stats[$asis->alumno_id])) {
                    continue;
                }
                $campo = $campoPorEstatus[$asis->estatus] ?? null;
                if ($campo) {
                    $stats[$asis->alumno_id][$campo]++;
                }
            }
        }

        $resumen = [];
        foreach ($stats as $s) {
            $inasistenciasEfectivas = $s['ausentes'] + $s['retardos'] * 0.5;
            $s['porcentaje_inasistencia'] = $totalSesiones > 0
                ? round($inasistenciasEfectivas / $totalSesiones * 100, 2)
                : 0;
            $resumen[] = $s;
        }

        return [$resumen, $totalSesiones];
    }

    /** Todos los alumnos inscritos en cualquiera de los grupos de esta carga (una carga
     * puede impartirse a varios grupos combinados a la vez). */
    private function alumnosDeCarga(CargaAcademica $carga)
    {
        $grupoIds = $carga->grupos->pluck('id');

        return Alumno::whereHas('grupos', fn ($q) => $q->whereIn('grupos.id', $grupoIds))
            ->whereNotNull('user_id')
            ->with(['user', 'inscripcion.aspirante'])
            ->orderBy('numero_control')
            ->get()
            ->map(fn (Alumno $a) => (object) [
                'user_id'         => $a->user_id,
                'numero_control'  => $a->numero_control,
                'nombre_completo' => $this->nombreAlumno($a),
            ]);
    }

    private function nombreAlumno(Alumno $alumno): string
    {
        $asp = $alumno->inscripcion?->aspirante;
        if ($asp) {
            return trim(collect([$asp->apellido_paterno, $asp->apellido_materno, $asp->nombres])->filter()->implode(' '));
        }

        return $alumno->user?->name ?? $alumno->numero_control;
    }
}
