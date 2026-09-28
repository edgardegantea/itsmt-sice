<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\ActaCalificacionesCaptura;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\CalificacionHistorial;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\CierreDeCurso;
use App\Domains\Academico\Models\ConfiguracionEvaluacion;
use App\Domains\Academico\Models\CorteCaptura;
use App\Domains\Academico\Models\Grupo;
use App\Domains\Academico\Models\PlaneacionDocente;
use App\Exports\ActaCalificacionesExport;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Mail\ActaCalificacionesGeneradaMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class CalificacionController extends Controller
{
    public function porGrupo(Request $request, string $grupoId): JsonResponse
    {
        $grupo = Grupo::with(['cargas.docente'])->findOrFail($grupoId);

        $user = $request->user();

        // Docente: solo sus grupos
        if ($user->hasRole('docente')) {
            $esSuGrupo = $grupo->cargas()->where('docente_id', $user->id)->exists();
            if (! $esSuGrupo) {
                return ApiResponse::error('No tienes acceso a este grupo.', 403);
            }
        }

        // Jefe de carrera: solo su carrera
        if ($user->hasRole('jefe_carrera') && $user->carrera_id !== $grupo->carrera_id) {
            return ApiResponse::error('No tienes acceso a grupos de otra carrera.', 403);
        }

        $calificaciones = Calificacion::with(['alumno.user'])
            ->where('grupo_id', $grupoId)
            ->get();

        return ApiResponse::success($calificaciones);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $grupo = Grupo::with('cargas.materia', 'periodo', 'alumnos')->findOrFail($request->input('grupo_id'));
        $config = ConfiguracionEvaluacion::where('carrera_id', $grupo->carrera_id)->first();

        // El número de parciales a capturar debe coincidir con las unidades de la
        // instrumentación didáctica (planeación) que el docente entregó para esta
        // asignatura y periodo — su nombre y cantidad son los que el docente definió,
        // no un valor fijo. Si aún no existe planeación, se cae al temario oficial
        // de la materia y, en último caso, a 3.
        $cargaParaValidar = $grupo->cargas->firstWhere('id', $request->input('carga_academica_id'));
        $unidadesPlaneacion = $cargaParaValidar
            ? $this->unidadesPlaneacion($cargaParaValidar->id, $grupo->periodo_id)
            : null;
        $numParciales = $unidadesPlaneacion?->count()
            ?: count($cargaParaValidar?->materia?->temario ?? [])
            ?: 3;

        $data = $request->validate([
            'alumno_id'        => ['required', 'uuid', 'exists:alumnos,id'],
            'grupo_id'         => ['required', 'uuid', 'exists:grupos,id'],
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'parciales'        => ['nullable', 'array'],
            'parciales.*.parcial'      => ['required_with:parciales', 'integer', 'min:1', "max:{$numParciales}"],
            'parciales.*.calificacion' => ['required_with:parciales', 'numeric', 'min:0', 'max:100'],
            'calificacion_final'=> ['nullable', 'numeric', 'min:0', 'max:100'],
            'oportunidad'      => ['nullable', 'in:primera_oportunidad,segunda_oportunidad'],
        ]);

        // El alumno debe estar inscrito en este grupo
        if (! $grupo->alumnos->contains('id', $data['alumno_id'])) {
            return ApiResponse::error('El alumno indicado no está inscrito en este grupo.', 422);
        }

        /** @var CargaAcademica|null $carga */
        $carga = $grupo->cargas->firstWhere('id', $data['carga_academica_id']);
        if (! $carga) {
            return ApiResponse::error('La carga académica indicada no pertenece a este grupo.', 422);
        }

        // Solo el docente asignado a esa materia (carga) puede capturar sus calificaciones
        if ($user->hasRole('docente')) {
            if ($carga->docente_id !== $user->id) {
                return ApiResponse::error('No estás asignado como docente a esta materia en este grupo.', 403);
            }
        } elseif (! $user->hasAnyRole(['superadmin', 'admin'])) {
            return ApiResponse::error('No tienes permiso para capturar calificaciones.', 403);
        }

        // Bloquear si el curso ya fue cerrado
        $yaFueCerrado = CierreDeCurso::where('grupo_id', $data['grupo_id'])->exists();
        if ($yaFueCerrado) {
            return ApiResponse::error('El curso ya fue cerrado. No se pueden modificar calificaciones.', 422);
        }

        // El periodo de captura debe estar activo
        if (! $grupo->periodo || ! $grupo->periodo->activo) {
            return ApiResponse::error('El periodo de captura no está activo para esta materia.', 422);
        }

        // Snapshot "antes" — se usa tanto para el bloqueo por corte de captura como para
        // la bitácora de cambios (calificaciones_historial) que revisan DA/Jefatura/etc.
        $existente = Calificacion::where([
            'alumno_id'          => $data['alumno_id'],
            'grupo_id'           => $data['grupo_id'],
            'carga_academica_id' => $carga->id,
        ])->first();

        // Bloqueo por corte de captura: si un parcial ya fue capturado y su
        // corte correspondiente ya venció, solo un admin/director puede modificarlo.
        if (! empty($data['parciales'])) {
            $puedeAnularCorte = $user->hasAnyRole(['superadmin', 'admin', 'director_academico']);

            if ($existente && ! $puedeAnularCorte) {
                $cortes = CorteCaptura::where('periodo_id', $grupo->periodo_id)->get()->keyBy('numero');

                foreach ($data['parciales'] as $p) {
                    $numero = (int) $p['parcial'];
                    $corte = $cortes->get($numero);

                    if (! $corte) {
                        continue;
                    }

                    $yaCapturado = collect($existente->parciales ?? [])
                        ->contains(fn ($pp) => (int) ($pp['parcial'] ?? 0) === $numero);

                    if ($yaCapturado && now()->toDateString() > $corte->fecha_limite_captura->toDateString()) {
                        $fecha = $corte->fecha_limite_captura->format('d/m/Y');
                        return ApiResponse::error(
                            "El corte {$numero} ya cerró el {$fecha}; contacta a un administrador para modificarlo.",
                            422
                        );
                    }
                }
            }
        }

        // Calcular promedio y acreditado si hay parciales y calificación final
        $promedio = null;
        $acreditado = null;

        if (! empty($data['parciales'])) {
            [$promedio, $acreditado] = $this->calcularPromedio(
                $data['parciales'],
                (float) ($data['calificacion_final'] ?? 0),
                $grupo,
                $carga
            );
        } elseif (isset($data['calificacion_final'])) {
            // Materias evaluadas solo con calificación final (sin parciales)
            $promedio = (float) $data['calificacion_final'];
            $acreditado = $promedio >= (float) ($config?->calificacion_minima ?? 70);
        }

        // Determinar tipo_curso e intento_numero para este alumno en esta materia
        [$tipoCurso, $intentoNumero] = Calificacion::resolverTipoCurso($data['alumno_id'], $carga);

        $calificacion = Calificacion::updateOrCreate(
            ['alumno_id' => $data['alumno_id'], 'grupo_id' => $data['grupo_id'], 'carga_academica_id' => $carga->id],
            array_merge($data, [
                'promedio'       => $promedio,
                'acreditado'     => $acreditado,
                'tipo_curso'     => $tipoCurso,
                'intento_numero' => $intentoNumero,
            ])
        );

        // Bitácora: cada guardado queda registrado con el antes/después, quién lo hizo y
        // cuándo — visible solo para DA, Jefatura, Control Escolar, Subdirección/Dirección
        // Académica, Dirección General y superadmin (ver CalificacionHistorialController).
        CalificacionHistorial::create([
            'calificacion_id'             => $calificacion->id,
            'alumno_id'                   => $data['alumno_id'],
            'grupo_id'                    => $data['grupo_id'],
            'carga_academica_id'          => $carga->id,
            'editado_por'                 => $user->id,
            'parciales_anteriores'        => $existente?->parciales,
            'parciales_nuevos'            => $data['parciales'] ?? null,
            'calificacion_final_anterior' => $existente?->calificacion_final,
            'calificacion_final_nueva'    => $data['calificacion_final'] ?? null,
            'promedio_anterior'           => $existente?->promedio,
            'promedio_nuevo'              => $promedio,
            'created_at'                  => now(),
        ]);

        // Si la calificación ya estaba publicada y se editó de todas formas (solo
        // superadmin/admin/director_academico pueden llegar aquí, por el bloqueo de
        // corte de arriba), Control Escolar debe enterarse — puede ser una corrección
        // legítima o una señal de algo irregular que amerita revisión.
        if ($existente?->publicada) {
            $destinatarios = \App\Models\User::role('control_escolar')->pluck('email')->filter()->all();
            if (! empty($destinatarios)) {
                \Illuminate\Support\Facades\Mail::to($destinatarios)
                    ->queue(new \App\Mail\CalificacionEditadaPublicadaMail($calificacion->fresh(['alumno.user', 'cargaAcademica.materia', 'grupo']), $user));
            }
        }

        return ApiResponse::success($calificacion->fresh('alumno'), 'Calificación guardada.', 201);
    }

    private const ROLES_VEN_HISTORIAL = [
        'superadmin', 'admin', 'desarrollo_academico', 'jefe_carrera', 'control_escolar',
        'subdireccion_academica', 'director_academico', 'direccion_academica', 'direccion_general',
    ];

    // GET /api/grupos/{grupo}/calificaciones/historial?carga_academica_id=...
    // Bitácora completa de ediciones de calificaciones de una materia en un grupo —
    // quién capturó/editó qué y cuándo, para supervisión (no accesible al docente).
    public function historial(Request $request, string $grupoId): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasAnyRole(self::ROLES_VEN_HISTORIAL)) {
            return ApiResponse::error('No tienes permiso para ver la bitácora de calificaciones.', 403);
        }

        $cargaAcademicaId = $request->query('carga_academica_id');

        $historial = CalificacionHistorial::with(['alumno.user', 'editor'])
            ->where('grupo_id', $grupoId)
            ->when($cargaAcademicaId, fn ($q, $v) => $q->where('carga_academica_id', $v))
            ->when($request->query('editado_por'), fn ($q, $v) => $q->where('editado_por', $v))
            ->when($request->query('desde'), fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->query('hasta'), fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($historial);
    }

    // GET /api/grupos/{grupo}/calificaciones/exportar?carga_academica_id=...
    // Acta de calificaciones en CSV (se abre directo en Excel) — mismo alcance que el PDF
    // del acta pero editable/procesable por Control Escolar.
    public function exportarCsv(Request $request, string $grupoId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $grupo = Grupo::with(['cargas' => fn ($q) => $q->where('cargas_academicas.id', $request->query('carga_academica_id'))->with('materia'),
            'alumnos.inscripcion.aspirante'])->findOrFail($grupoId);

        $carga = $grupo->cargas->first();
        $cargaAcademicaId = $request->query('carga_academica_id');

        $calificaciones = Calificacion::where('grupo_id', $grupoId)
            ->when($cargaAcademicaId, fn ($q, $v) => $q->where('carga_academica_id', $v))
            ->get()
            ->keyBy('alumno_id');

        $numParciales = max(1, $calificaciones->flatMap(fn ($c) => collect($c->parciales ?? [])->pluck('parcial'))->max() ?? 3);

        $nombreArchivo = 'acta_' . ($carga?->materia?->nombre ? \Illuminate\Support\Str::slug($carga->materia->nombre) : 'calificaciones') . '.csv';

        return response()->streamDownload(function () use ($grupo, $calificaciones, $numParciales) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM para que Excel detecte UTF-8

            $encabezado = ['No. Control', 'Alumno'];
            for ($i = 1; $i <= $numParciales; $i++) $encabezado[] = "P{$i}";
            $encabezado = array_merge($encabezado, ['Final', 'Promedio', 'Estatus']);
            fputcsv($out, $encabezado);

            foreach ($grupo->alumnos as $alumno) {
                $cal = $calificaciones->get($alumno->id);
                $asp = $alumno->inscripcion?->aspirante;
                $nombre = $asp ? trim("{$asp->apellido_paterno} {$asp->apellido_materno} {$asp->nombres}") : ($alumno->user?->name ?? '');

                $fila = [$alumno->numero_control, $nombre];
                for ($i = 1; $i <= $numParciales; $i++) {
                    $p = collect($cal?->parciales ?? [])->firstWhere('parcial', $i);
                    $fila[] = $p['calificacion'] ?? '';
                }
                $fila[] = $cal?->calificacion_final ?? '';
                $fila[] = $cal?->promedio ?? '';
                $fila[] = $cal?->calificacion_final === null ? '' : ($cal->acreditado ? 'APROBADO' : 'NO APROBADO');
                fputcsv($out, $fila);
            }

            fclose($out);
        }, $nombreArchivo, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // GET /api/grupos/{grupo}/calificaciones/acta-pdf?carga_academica_id=...  — acta de
    // calificaciones imprimible con firma del docente y de Control Escolar. A diferencia de
    // ActaCalificacionesController::pdf (el acta oficial/permanente de Cierre de Curso, solo
    // para admin/DA tras cerrar el curso), esta la puede generar el propio docente en
    // cualquier momento como comprobante de lo capturado hasta ahora.
    // Roles con acceso de solo-consulta al acta de captura (además del propio docente
    // dueño de la materia). "control_escolar" es quien la firma (ver ROLES_FIRMA_ACTA).
    private const ROLES_ACTA_CONSULTA = [
        'superadmin', 'admin', 'jefe_carrera', 'director_academico',
        'desarrollo_academico', 'personal_administrativo', 'control_escolar',
    ];
    private const ROLES_FIRMA_ACTA = ['superadmin', 'admin', 'control_escolar'];
    private const RANGOS_DISTRIBUCION = [
        '90-100' => [90, 100], '80-89' => [80, 89.99], '70-79' => [70, 79.99],
        '60-69' => [60, 69.99], '<60' => [0, 59.99],
    ];

    /**
     * Resuelve grupo/carga y valida acceso para las acciones del acta de captura
     * (pdf/excel/estado/firmar). Devuelve una Response en caso de error, o el
     * contexto completo (grupo, carga, alumnos activos, calificaciones, planeación,
     * estadísticas) listo para usarse.
     */
    private function resolverContextoActa(Request $request, string $grupoId, ?string $cargaAcademicaId): array|JsonResponse
    {
        $user = $request->user();

        $grupo = Grupo::with(['cargas' => fn ($q) => $q->with('materia', 'docente'), 'periodo', 'carrera', 'alumnos.user'])
            ->findOrFail($grupoId);

        if ($user->hasRole('docente')) {
            $esSuGrupo = $grupo->cargas->contains(fn ($c) => $c->docente_id === $user->id
                && (! $cargaAcademicaId || $c->id === $cargaAcademicaId));
            if (! $esSuGrupo) {
                return response()->json(['message' => 'No tienes acceso a este grupo.'], 403);
            }
        } elseif (! $user->hasAnyRole(self::ROLES_ACTA_CONSULTA)) {
            return response()->json(['message' => 'No tienes permiso.'], 403);
        }
        if ($user->hasRole('jefe_carrera') && $user->carrera_id !== $grupo->carrera_id) {
            return response()->json(['message' => 'No tienes acceso a grupos de otra carrera.'], 403);
        }

        $carga = $cargaAcademicaId ? $grupo->cargas->firstWhere('id', $cargaAcademicaId) : $grupo->cargas->first();
        if (! $carga) {
            return response()->json(['message' => 'Materia no encontrada en este grupo.'], 404);
        }

        // Solo alumnos activos/egresados — de baja no deben aparecer en el acta.
        $alumnos = $grupo->alumnos
            ->reject(fn ($a) => in_array($a->estatus, ['baja_temporal', 'baja_definitiva'], true))
            ->sortBy('numero_control')
            ->values();

        $calificaciones = Calificacion::where('grupo_id', $grupoId)
            ->where('carga_academica_id', $carga->id)
            ->get()
            ->keyBy('alumno_id');

        // Nombres/porcentaje de unidad tal como el docente los definió en su instrumentación
        // didáctica (planeación) — igual que en la pantalla de captura. Una misma materia+
        // grupo puede repartirse en varios bloques día/hora, cada uno con su propio
        // carga_academica_id, y el docente pudo haber guardado un borrador contra alguno de
        // ellos y liberado la definitiva contra otro — si existe una liberada entre los
        // candidatos, esa es la que cuenta (no la primera que se haya creado).
        $idsMismaMateria = $grupo->cargas->where('materia_id', $carga->materia_id)->pluck('id');
        $planeacionesCandidatas = PlaneacionDocente::where('periodo_id', $grupo->periodo_id)
            ->whereIn('carga_academica_id', $idsMismaMateria)
            ->get();
        $planeacion = $planeacionesCandidatas->firstWhere('estatus', 'liberada') ?? $planeacionesCandidatas->first();

        $finalesCapturados = $alumnos->filter(fn ($a) => $calificaciones->get($a->id)?->calificacion_final !== null);
        $borrador = $alumnos->isNotEmpty() && $finalesCapturados->count() < $alumnos->count();

        $finales = $finalesCapturados->map(fn ($a) => (float) $calificaciones->get($a->id)->calificacion_final);
        $distribucion = collect(self::RANGOS_DISTRIBUCION)->map(
            fn ($rango) => $finales->filter(fn ($f) => $f >= $rango[0] && $f <= $rango[1])->count()
        );

        $stats = [
            'total_alumnos' => $alumnos->count(),
            'con_final' => $finalesCapturados->count(),
            'aprobados' => $alumnos->filter(fn ($a) => $calificaciones->get($a->id)?->acreditado === true)->count(),
            'no_aprobados' => $alumnos->filter(fn ($a) => $calificaciones->get($a->id)?->calificacion_final !== null && ! $calificaciones->get($a->id)->acreditado)->count(),
            'promedio_grupal' => $finales->isNotEmpty() ? round($finales->avg(), 2) : null,
            'maxima' => $finales->isNotEmpty() ? $finales->max() : null,
            'minima' => $finales->isNotEmpty() ? $finales->min() : null,
            'distribucion' => $distribucion,
        ];

        return [
            'grupo' => $grupo,
            'carga' => $carga,
            'alumnos' => $alumnos,
            'calificaciones' => $calificaciones,
            'planeacion' => $planeacion,
            'borrador' => $borrador,
            'stats' => $stats,
        ];
    }

    // GET /api/grupos/{grupo}/calificaciones/acta-pdf?carga_academica_id=...
    public function actaPdf(Request $request, string $grupoId): \Symfony\Component\HttpFoundation\Response
    {
        $ctx = $this->resolverContextoActa($request, $grupoId, $request->query('carga_academica_id'));
        if ($ctx instanceof JsonResponse) return $ctx;

        if (! $ctx['planeacion'] || $ctx['planeacion']->estatus !== 'liberada') {
            return response()->json(['message' => 'Debes entregar y liberar la instrumentación didáctica de esta materia antes de generar el acta.'], 422);
        }

        $acta = $this->registrarGeneracionActa($request, $ctx['grupo'], $ctx['carga']);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.acta_calificaciones_captura', [
            'grupo' => $ctx['grupo'],
            'carga' => $ctx['carga'],
            'alumnos' => $ctx['alumnos'],
            'calificaciones' => $ctx['calificaciones'],
            'borrador' => $ctx['borrador'],
            'stats' => $ctx['stats'],
            'acta' => $acta,
        ])->setPaper('letter', 'portrait');

        $materia = $ctx['carga']->materia?->nombre ?? 'calificaciones';
        return $pdf->download("acta_{$materia}.pdf");
    }

    // GET /api/grupos/{grupo}/calificaciones/acta-excel?carga_academica_id=...
    public function actaExcel(Request $request, string $grupoId): \Symfony\Component\HttpFoundation\Response
    {
        $ctx = $this->resolverContextoActa($request, $grupoId, $request->query('carga_academica_id'));
        if ($ctx instanceof JsonResponse) return $ctx;

        if (! $ctx['planeacion'] || $ctx['planeacion']->estatus !== 'liberada') {
            return response()->json(['message' => 'Debes entregar y liberar la instrumentación didáctica de esta materia antes de generar el acta.'], 422);
        }

        $this->registrarGeneracionActa($request, $ctx['grupo'], $ctx['carga']);

        $materia = $ctx['carga']->materia?->nombre ?? 'calificaciones';
        return Excel::download(
            new ActaCalificacionesExport($ctx['grupo'], $ctx['carga'], $ctx['alumnos'], $ctx['calificaciones']),
            "acta_{$materia}.xlsx"
        );
    }

    // GET /api/grupos/{grupo}/calificaciones/acta-estado?carga_academica_id=...  (folio,
    // quién y cuándo la generó/firmó — para que el frontend muestre el estatus y el
    // botón de "Firmar" solo cuando aplica)
    public function actaEstado(Request $request, string $grupoId): JsonResponse
    {
        $ctx = $this->resolverContextoActa($request, $grupoId, $request->query('carga_academica_id'));
        if ($ctx instanceof JsonResponse) return $ctx;

        $acta = ActaCalificacionesCaptura::where('grupo_id', $grupoId)
            ->where('carga_academica_id', $ctx['carga']->id)
            ->with(['generadoPor', 'firmadoPor'])
            ->first();

        return ApiResponse::success([
            // Se arma el array a mano (en vez de serializar el modelo con las relaciones
            // cargadas) porque "generadoPor"/"firmadoPor" se convierten a snake_case
            // ("generado_por"/"firmado_por") al serializar y pisarían las columnas FK
            // del mismo nombre.
            'acta' => $acta ? [
                'id' => $acta->id,
                'grupo_id' => $acta->grupo_id,
                'carga_academica_id' => $acta->carga_academica_id,
                'folio' => $acta->folio,
                'generado_por' => $acta->generado_por,
                'generado_en' => $acta->generado_en,
                'generado_por_nombre' => $acta->generadoPor?->name,
                'firmado_por' => $acta->firmado_por,
                'firmado_en' => $acta->firmado_en,
                'firmado_por_nombre' => $acta->firmadoPor?->name,
            ] : null,
            'puede_firmar' => $request->user()->hasAnyRole(self::ROLES_FIRMA_ACTA),
            'planeacion_liberada' => $ctx['planeacion']?->estatus === 'liberada',
            'borrador' => $ctx['borrador'],
        ]);
    }

    // PATCH /api/grupos/{grupo}/calificaciones/acta-pdf/firmar  (representante de Control
    // Escolar, o admin/superadmin, firma electrónicamente el acta ya generada)
    public function actaFirmar(Request $request, string $grupoId): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_FIRMA_ACTA)) {
            return ApiResponse::error('No tienes permiso para firmar actas.', 403);
        }

        $data = $request->validate(['carga_academica_id' => ['required', 'uuid']]);

        $acta = ActaCalificacionesCaptura::where('grupo_id', $grupoId)
            ->where('carga_academica_id', $data['carga_academica_id'])
            ->first();

        if (! $acta) {
            return ApiResponse::error('Primero debe generarse el acta antes de firmarla.', 422);
        }

        $acta->update(['firmado_por' => $request->user()->id, 'firmado_en' => now()]);
        $acta->load(['generadoPor', 'firmadoPor']);

        return ApiResponse::success([
            'id' => $acta->id,
            'grupo_id' => $acta->grupo_id,
            'carga_academica_id' => $acta->carga_academica_id,
            'folio' => $acta->folio,
            'generado_por' => $acta->generado_por,
            'generado_en' => $acta->generado_en,
            'generado_por_nombre' => $acta->generadoPor?->name,
            'firmado_por' => $acta->firmado_por,
            'firmado_en' => $acta->firmado_en,
            'firmado_por_nombre' => $acta->firmadoPor?->name,
        ], 'Acta firmada.');
    }

    /** Crea o actualiza el registro de generación del acta (folio estable por grupo+materia;
     * cada regeneración solo actualiza quién/cuándo la volvió a generar) y notifica a
     * Control Escolar la primera vez. */
    private function registrarGeneracionActa(Request $request, Grupo $grupo, CargaAcademica $carga): ActaCalificacionesCaptura
    {
        $existente = ActaCalificacionesCaptura::where('grupo_id', $grupo->id)
            ->where('carga_academica_id', $carga->id)
            ->first();

        if ($existente) {
            $existente->update(['generado_por' => $request->user()->id, 'generado_en' => now()]);
            return $existente->fresh(['generadoPor', 'firmadoPor']);
        }

        $acta = ActaCalificacionesCaptura::create([
            'grupo_id' => $grupo->id,
            'carga_academica_id' => $carga->id,
            'periodo_id' => $grupo->periodo_id,
            'folio' => 'ACTA-' . strtoupper(Str::random(8)),
            'generado_por' => $request->user()->id,
            'generado_en' => now(),
        ])->fresh(['generadoPor', 'firmadoPor']);

        $destinatarios = \App\Models\User::role('control_escolar')->pluck('email')->filter()->all();
        if (! empty($destinatarios)) {
            Mail::to($destinatarios)->queue(new ActaCalificacionesGeneradaMail($acta));
        }

        return $acta;
    }

    // POST /api/grupos/{grupo}/calificaciones/importar  (multipart: archivo csv +
    // carga_academica_id) — captura masiva por CSV con las mismas columnas que exporta
    // exportarCsv(): No. Control, Alumno, P1..PN, Final, Promedio, Estatus (las tres
    // últimas se ignoran al importar, solo se leen No. Control y P1..PN).
    public function importarCsv(Request $request, string $grupoId): JsonResponse
    {
        $user = $request->user();
        $grupo = Grupo::with('cargas.materia', 'periodo', 'alumnos.inscripcion.aspirante')->findOrFail($grupoId);

        $data = $request->validate([
            'archivo'            => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
        ]);

        $carga = $grupo->cargas->firstWhere('id', $data['carga_academica_id']);
        if (! $carga) {
            return ApiResponse::error('La carga académica indicada no pertenece a este grupo.', 422);
        }

        if ($user->hasRole('docente') && $carga->docente_id !== $user->id) {
            return ApiResponse::error('No estás asignado como docente a esta materia en este grupo.', 403);
        } elseif (! $user->hasRole('docente') && ! $user->hasAnyRole(['superadmin', 'admin'])) {
            return ApiResponse::error('No tienes permiso para capturar calificaciones.', 403);
        }

        if (CierreDeCurso::where('grupo_id', $grupoId)->exists()) {
            return ApiResponse::error('El curso ya fue cerrado. No se pueden modificar calificaciones.', 422);
        }
        if (! $grupo->periodo || ! $grupo->periodo->activo) {
            return ApiResponse::error('El periodo de captura no está activo para esta materia.', 422);
        }

        $unidadesPlaneacion = $this->unidadesPlaneacion($carga->id, $grupo->periodo_id);
        $numParciales = $unidadesPlaneacion?->count() ?: count($carga->materia?->temario ?? []) ?: 3;

        $alumnosPorControl = $grupo->alumnos->keyBy('numero_control');

        $handle = fopen($data['archivo']->getRealPath(), 'r');
        $encabezado = fgetcsv($handle);
        // Quita el BOM UTF-8 si el archivo lo trae (el que genera exportarCsv lo incluye).
        if ($encabezado && isset($encabezado[0])) {
            $encabezado[0] = preg_replace('/^\x{FEFF}/u', '', $encabezado[0]);
        }

        $actualizados = 0;
        $errores = [];
        $fila = 1;

        while (($registro = fgetcsv($handle)) !== false) {
            $fila++;
            if (count($registro) < 2 || trim((string) $registro[0]) === '') continue;

            $numeroControl = trim((string) $registro[0]);
            $alumno = $alumnosPorControl->get($numeroControl);
            if (! $alumno) {
                $errores[] = "Fila {$fila}: no se encontró al alumno con no. de control {$numeroControl}.";
                continue;
            }

            $parciales = [];
            for ($i = 1; $i <= $numParciales; $i++) {
                $valorCrudo = trim((string) ($registro[1 + $i] ?? ''));
                if ($valorCrudo === '') continue;
                if (! is_numeric($valorCrudo) || $valorCrudo < 0 || $valorCrudo > 100) {
                    $errores[] = "Fila {$fila} ({$numeroControl}): P{$i} debe ser un número entre 0 y 100.";
                    continue 2;
                }
                $parciales[] = ['parcial' => $i, 'calificacion' => (float) $valorCrudo];
            }

            if (empty($parciales)) continue;

            $existente = Calificacion::where([
                'alumno_id' => $alumno->id, 'grupo_id' => $grupoId, 'carga_academica_id' => $carga->id,
            ])->first();

            [$promedio, $acreditado] = $this->calcularPromedio($parciales, (float) ($existente?->calificacion_final ?? 0), $grupo, $carga);
            [$tipoCurso, $intentoNumero] = Calificacion::resolverTipoCurso($alumno->id, $carga);

            $calificacion = Calificacion::updateOrCreate(
                ['alumno_id' => $alumno->id, 'grupo_id' => $grupoId, 'carga_academica_id' => $carga->id],
                [
                    'parciales' => $parciales, 'promedio' => $promedio, 'acreditado' => $acreditado,
                    'tipo_curso' => $tipoCurso, 'intento_numero' => $intentoNumero,
                ]
            );

            CalificacionHistorial::create([
                'calificacion_id' => $calificacion->id, 'alumno_id' => $alumno->id, 'grupo_id' => $grupoId,
                'carga_academica_id' => $carga->id, 'editado_por' => $user->id,
                'parciales_anteriores' => $existente?->parciales, 'parciales_nuevos' => $parciales,
                'calificacion_final_anterior' => $existente?->calificacion_final,
                'calificacion_final_nueva' => $existente?->calificacion_final,
                'promedio_anterior' => $existente?->promedio, 'promedio_nuevo' => $promedio,
                'created_at' => now(),
            ]);

            $actualizados++;
        }
        fclose($handle);

        return ApiResponse::success([
            'actualizados' => $actualizados,
            'errores' => $errores,
        ], $actualizados > 0 ? "Se importaron {$actualizados} registro(s)." : 'No se importó ningún registro.');
    }

    private function calcularPromedio(array $parciales, float $calFinal, Grupo $grupo, ?CargaAcademica $carga = null): array
    {
        // Obtener configuración de evaluación de la carrera del grupo
        $config = ConfiguracionEvaluacion::where('carrera_id', $grupo->carrera_id)->first();

        // Prioridad 1: porcentajes por unidad definidos por el docente en su
        // instrumentación didáctica (planeación) para esta materia/periodo —
        // son los pesos reales que el docente entregó y Jefatura/Dirección
        // liberaron, no un promedio genérico por carrera.
        $unidades = $carga ? $this->unidadesPlaneacion($carga->id, $grupo->periodo_id) : null;
        $sumaPorcentajesUnidades = $unidades?->sum('porcentaje') ?? 0;

        if ($unidades && $unidades->isNotEmpty() && abs($sumaPorcentajesUnidades - 100) < 0.5) {
            $pesosUnidad = $unidades->keyBy('numero');
            $promedio = round(collect($parciales)->sum(function ($p) use ($pesosUnidad) {
                $peso = (float) ($pesosUnidad->get((int) $p['parcial'])['porcentaje'] ?? 0) / 100;
                return $p['calificacion'] * $peso;
            }), 2);
        } elseif ($config && ! empty($config->peso_parciales)) {
            // Prioridad 2: pesos genéricos configurados por carrera (fallback si el
            // docente aún no entrega o libera su instrumentación didáctica).
            $pesos = collect($config->peso_parciales)->keyBy('parcial');
            $promedio = round(collect($parciales)->sum(function ($p) use ($pesos) {
                $peso = $pesos->get($p['parcial'])['peso'] ?? 0;
                return $p['calificacion'] * $peso;
            }), 2);
        } else {
            // Sin planeación ni configuración: promedio simple de los parciales
            $promedio = round((float) collect($parciales)->avg('calificacion'), 2);
        }

        $min = $config?->calificacion_minima ?? 70;
        $acreditado = $promedio >= (float) $min;

        return [$promedio, $acreditado];
    }

    /**
     * Unidades (nombre + porcentaje) de la instrumentación didáctica liberada
     * o vigente que el docente entregó para esta carga académica y periodo.
     * Cada unidad corresponde al "parcial" con el mismo número.
     */
    private function unidadesPlaneacion(string $cargaAcademicaId, string $periodoId): ?Collection
    {
        $planeacion = PlaneacionDocente::where('carga_academica_id', $cargaAcademicaId)
            ->where('periodo_id', $periodoId)
            ->first();

        if (! $planeacion || empty($planeacion->competencias)) {
            return null;
        }

        return collect($planeacion->competencias)
            ->filter(fn ($c) => isset($c['numero']))
            ->values();
    }

    public function situacionAcademica(Request $request, string $alumnoId): JsonResponse
    {
        $user = $request->user();

        // Alumno solo puede ver su propia situación
        if ($user->hasRole('alumno')) {
            $alumno = \App\Domains\Academico\Models\Alumno::where('user_id', $user->id)->firstOrFail();
            if ($alumno->id !== $alumnoId) {
                return ApiResponse::error('Solo puedes ver tu propia situación académica.', 403);
            }
        } elseif (! $user->hasAnyRole([
            'superadmin', 'admin', 'jefe_carrera', 'director_academico', 'personal_administrativo', 'desarrollo_academico',
            ...\App\Models\User::ROLES_DIRECTIVOS,
        ])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        // Jefe de carrera: solo alumnos de su carrera
        if ($user->hasRole('jefe_carrera')) {
            $alumno = \App\Domains\Academico\Models\Alumno::find($alumnoId);
            if (! $alumno || $alumno->carrera_id !== $user->carrera_id) {
                return ApiResponse::error('No tienes acceso a alumnos de otra carrera.', 403);
            }
        }

        $calificaciones = Calificacion::with(['grupo.cargas.materia', 'grupo.periodo'])
            ->where('alumno_id', $alumnoId)
            ->orderBy('created_at', 'desc')
            ->get();

        $alertas = \App\Domains\Academico\Models\AlertaBajaDefinitiva::with('grupo.periodo')
            ->where('alumno_id', $alumnoId)
            ->get();

        // Resumen de asistencia — Asistencia.alumno_id referencia al User del alumno, no
        // al registro de Alumno (a diferencia de Calificacion.alumno_id), así que hay que
        // resolver el user_id antes de consultar.
        $alumnoModelo = \App\Domains\Academico\Models\Alumno::find($alumnoId);
        $resumenAsistencia = null;
        if ($alumnoModelo?->user_id) {
            $registrosAsistencia = \App\Domains\Academico\Models\Asistencia::where('alumno_id', $alumnoModelo->user_id)->get();
            $resumenAsistencia = [
                'total'        => $registrosAsistencia->count(),
                'presentes'    => $registrosAsistencia->where('estatus', 'presente')->count(),
                'ausentes'     => $registrosAsistencia->where('estatus', 'ausente')->count(),
                'retardos'     => $registrosAsistencia->where('estatus', 'retardo')->count(),
                'justificados' => $registrosAsistencia->where('estatus', 'justificado')->count(),
            ];
        }

        return ApiResponse::success([
            'calificaciones' => $calificaciones,
            'alertas_baja_definitiva' => $alertas,
            'resumen_asistencia' => $resumenAsistencia,
        ]);
    }

    public function kardex(Request $request, string $alumnoId): JsonResponse
    {
        $user = $request->user();

        // Alumno solo puede ver su propio kardex
        if ($user->hasRole('alumno')) {
            $alumno = \App\Domains\Academico\Models\Alumno::where('user_id', $user->id)->firstOrFail();
            if ($alumno->id !== $alumnoId) {
                return ApiResponse::error('Solo puedes ver tu propio kardex.', 403);
            }
        } elseif (! $user->hasAnyRole([
            'superadmin', 'admin', 'jefe_carrera', 'director_academico', 'personal_administrativo',
            ...\App\Models\User::ROLES_DIRECTIVOS,
        ])) {
            return ApiResponse::error('No tienes permiso.', 403);
        }

        if ($user->hasRole('jefe_carrera')) {
            $alumno = \App\Domains\Academico\Models\Alumno::find($alumnoId);
            if (! $alumno || $alumno->carrera_id !== $user->carrera_id) {
                return ApiResponse::error('No tienes acceso a alumnos de otra carrera.', 403);
            }
        }

        $kardex = \App\Domains\Academico\Models\Kardex::with(['grupo', 'periodo', 'cargaAcademica.materia'])
            ->where('alumno_id', $alumnoId)
            ->orderBy('fecha_registro', 'desc')
            ->get();

        return ApiResponse::success($kardex);
    }
}
