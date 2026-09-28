<?php

namespace App\Http\Controllers\Academico;

use App\Support\RichText;
use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\PlaneacionDocente;
use App\Domains\Academico\Models\PlaneacionDocenteVersion;
use App\Domains\Academico\Models\PlaneacionComentario;
use App\Domains\Academico\Models\PlaneacionArchivo;
use App\Domains\Academico\Models\Periodo;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Carbon\Carbon;
use App\Domains\Academico\Models\Calificacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class PlaneacionDocenteController extends Controller
{
    // Campos de contenido que forman el "snapshot" de una versión — deliberadamente NO
    // incluye estatus/revisado_*/archivo_* (esos son metadatos del flujo de aprobación, no
    // contenido que el docente redacta y quisiera poder comparar/restaurar).
    private const SNAPSHOT_CAMPOS = [
        'caracterizacion', 'intencion_didactica', 'competencia_asignatura', 'competencias',
        'fuentes_informacion', 'apoyos_didacticos', 'calendarizacion',
    ];

    private function snapshotDe(PlaneacionDocente $planeacion): array
    {
        return collect(self::SNAPSHOT_CAMPOS)->mapWithKeys(fn ($campo) => [$campo => $planeacion->{$campo}])->all();
    }

    // Guarda una versión del estado ACTUAL (antes de sobrescribirlo) solo si el contenido
    // difiere de la última versión guardada — así el autoguardado frecuente del editor no
    // genera una fila nueva por cada tecla, solo cuando de verdad cambió algo desde el
    // último snapshot.
    private function guardarVersionSiCambio(PlaneacionDocente $planeacion, string $motivo, ?string $usuarioId): void
    {
        $snapshotActual = $this->snapshotDe($planeacion);

        $ultima = $planeacion->versiones()->first();
        if ($ultima && json_encode($ultima->snapshot) === json_encode($snapshotActual)) {
            return;
        }

        PlaneacionDocenteVersion::create([
            'planeacion_docente_id' => $planeacion->id,
            'creado_por'            => $usuarioId,
            'motivo'                => $motivo,
            'snapshot'              => $snapshotActual,
        ]);
    }

    // GET /api/planeaciones-docentes/{planeacion}/versiones
    public function versiones(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        $esDueño = $planeacionDocente->docente_id === $request->user()->id;
        if (! $esDueño && ! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            return ApiResponse::error('No tienes permiso para ver el historial de esta planeación.', 403);
        }

        $snapshotActual = $this->snapshotDe($planeacionDocente);
        $versiones = $planeacionDocente->versiones()->with('creadoPor:id,name')->get();

        return ApiResponse::success($versiones->map(fn ($v) => [
            'id'             => $v->id,
            'motivo'         => $v->motivo,
            'creado_por'     => $v->creadoPor?->name,
            'created_at'     => $v->created_at,
            'campos_cambiados' => $v->camposDistintosDe($snapshotActual),
        ]));
    }

    // POST /api/planeaciones-docentes/{planeacion}/versiones/{version}/restaurar
    public function restaurarVersion(Request $request, PlaneacionDocente $planeacionDocente, PlaneacionDocenteVersion $version): JsonResponse
    {
        if ($version->planeacion_docente_id !== $planeacionDocente->id) {
            return ApiResponse::error('Esa versión no pertenece a esta planeación.', 404);
        }

        if ($planeacionDocente->docente_id !== $request->user()->id
            && ! $request->user()->hasAnyRole(['superadmin', 'admin', 'desarrollo_academico'])) {
            return ApiResponse::error('No tienes permiso para restaurar versiones de esta planeación.', 403);
        }

        // Se archiva el estado actual (antes de sobrescribirlo) como una versión más, para
        // que restaurar nunca sea una operación sin retorno — el docente puede "deshacer la
        // restauración" igual que cualquier otro cambio, volviendo a esta versión intermedia.
        $this->guardarVersionSiCambio($planeacionDocente, 'antes_de_restaurar', $request->user()->id);

        $planeacionDocente->update($version->snapshot);

        // Se registra también el resultado de la restauración como su propia versión, para
        // que el historial deje claro en qué punto se restauró y a qué contenido.
        $this->guardarVersionSiCambio($planeacionDocente->fresh(), 'restaurada', $request->user()->id);

        return ApiResponse::success($planeacionDocente->fresh(), 'Versión restaurada.');
    }

    private function puedeVerComentarios(Request $request, PlaneacionDocente $planeacionDocente): bool
    {
        return $planeacionDocente->docente_id === $request->user()->id || $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ]);
    }

    // GET /api/planeaciones-docentes/{planeacion}/comentarios  (hilos anclados a un campo
    // específico — sección/unidad/categoría — visibles tanto al docente como a los roles
    // revisores; el frontend los agrupa por ancla para mostrar cada hilo por separado)
    public function comentarios(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if (! $this->puedeVerComentarios($request, $planeacionDocente)) {
            return ApiResponse::error('No tienes permiso para ver los comentarios de esta planeación.', 403);
        }

        $comentarios = PlaneacionComentario::where('planeacion_docente_id', $planeacionDocente->id)
            ->with('autor:id,name')
            ->orderBy('created_at')
            ->get();

        return ApiResponse::success($comentarios->map(fn ($c) => [
            'id'         => $c->id,
            'seccion'    => $c->seccion,
            'unidad'     => $c->unidad,
            'categoria'  => $c->categoria,
            'mensaje'    => $c->mensaje,
            'resuelto'   => $c->resuelto,
            'autor'      => $c->autor?->name,
            'autor_id'   => $c->autor_id,
            'created_at' => $c->created_at,
        ]));
    }

    // POST /api/planeaciones-docentes/{planeacion}/comentarios  (agregar un mensaje a un hilo
    // — si no existía hilo en esa ancla, este mensaje lo abre)
    public function agregarComentario(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if (! $this->puedeVerComentarios($request, $planeacionDocente)) {
            return ApiResponse::error('No tienes permiso para comentar en esta planeación.', 403);
        }

        $data = $request->validate([
            'seccion'   => ['required', 'in:caracterizacion,intencion_didactica,competencia_asignatura,especifica,dosificacion,calendarizacion'],
            'unidad'    => ['nullable', 'integer'],
            'categoria' => ['nullable', 'string', 'max:40'],
            'mensaje'   => ['required', 'string', 'max:1000'],
        ]);

        // Responder en un hilo ya marcado como resuelto lo reabre — tiene más sentido que
        // obligar a un paso aparte para "reabrir" antes de poder contestar.
        PlaneacionComentario::where('planeacion_docente_id', $planeacionDocente->id)
            ->where('seccion', $data['seccion'])
            ->where('unidad', $data['unidad'] ?? null)
            ->where('categoria', $data['categoria'] ?? null)
            ->update(['resuelto' => false]);

        $comentario = PlaneacionComentario::create([
            'planeacion_docente_id' => $planeacionDocente->id,
            'autor_id'              => $request->user()->id,
            'seccion'               => $data['seccion'],
            'unidad'                => $data['unidad'] ?? null,
            'categoria'             => $data['categoria'] ?? null,
            'mensaje'               => $data['mensaje'],
            'resuelto'              => false,
        ]);

        return ApiResponse::success($comentario->load('autor:id,name'), 'Comentario agregado.', 201);
    }

    // PATCH /api/planeaciones-docentes/{planeacion}/comentarios/resolver  (marca/desmarca
    // todo el hilo de una ancla como resuelto — cualquiera con acceso al hilo puede resolverlo,
    // igual que en Google Docs cualquier colaborador puede cerrar un comentario)
    public function resolverComentarios(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if (! $this->puedeVerComentarios($request, $planeacionDocente)) {
            return ApiResponse::error('No tienes permiso para modificar los comentarios de esta planeación.', 403);
        }

        $data = $request->validate([
            'seccion'   => ['required', 'in:caracterizacion,intencion_didactica,competencia_asignatura,especifica,dosificacion,calendarizacion'],
            'unidad'    => ['nullable', 'integer'],
            'categoria' => ['nullable', 'string', 'max:40'],
            'resuelto'  => ['required', 'boolean'],
        ]);

        PlaneacionComentario::where('planeacion_docente_id', $planeacionDocente->id)
            ->where('seccion', $data['seccion'])
            ->where('unidad', $data['unidad'] ?? null)
            ->where('categoria', $data['categoria'] ?? null)
            ->update(['resuelto' => $data['resuelto']]);

        return ApiResponse::success(null, $data['resuelto'] ? 'Hilo marcado como resuelto.' : 'Hilo reabierto.');
    }

    // GET /api/planeaciones-docentes/{planeacion}/archivos  (rúbricas/material adjunto —
    // general o ligado a una unidad; mismo control de acceso que comentarios/versiones)
    public function archivos(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if (! $this->puedeVerComentarios($request, $planeacionDocente)) {
            return ApiResponse::error('No tienes permiso para ver los archivos de esta planeación.', 403);
        }

        $archivos = PlaneacionArchivo::where('planeacion_docente_id', $planeacionDocente->id)
            ->with('subidoPor:id,name')
            ->orderBy('created_at')
            ->get();

        return ApiResponse::success($archivos->map(fn ($a) => [
            'id'              => $a->id,
            'unidad'          => $a->unidad,
            'nombre_original' => $a->nombre_original,
            'mime_type'       => $a->mime_type,
            'tamano_bytes'    => $a->tamano_bytes,
            'subido_por'      => $a->subidoPor?->name,
            'subido_por_id'   => $a->subido_por,
            'created_at'      => $a->created_at,
        ]));
    }

    // POST /api/planeaciones-docentes/{planeacion}/archivos  (subir un adjunto)
    public function subirArchivo(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if (! $this->puedeVerComentarios($request, $planeacionDocente)) {
            return ApiResponse::error('No tienes permiso para adjuntar archivos a esta planeación.', 403);
        }

        $data = $request->validate([
            'archivo' => ['required', 'file', 'max:15360', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,txt,zip'],
            'unidad'  => ['nullable', 'integer'],
        ]);

        $path = $data['archivo']->store('planeaciones_docentes_adjuntos', 'local');

        $archivo = PlaneacionArchivo::create([
            'planeacion_docente_id' => $planeacionDocente->id,
            'subido_por'            => $request->user()->id,
            'unidad'                => $data['unidad'] ?? null,
            'nombre_original'       => $data['archivo']->getClientOriginalName(),
            'path'                  => $path,
            'mime_type'             => $data['archivo']->getClientMimeType(),
            'tamano_bytes'          => $data['archivo']->getSize(),
        ]);

        return ApiResponse::success($archivo->load('subidoPor:id,name'), 'Archivo adjuntado.', 201);
    }

    // DELETE /api/planeaciones-docentes/{planeacion}/archivos/{archivo}
    public function eliminarArchivo(Request $request, PlaneacionDocente $planeacionDocente, PlaneacionArchivo $archivo): JsonResponse
    {
        if ($archivo->planeacion_docente_id !== $planeacionDocente->id) {
            return ApiResponse::error('Ese archivo no pertenece a esta planeación.', 404);
        }

        // Solo quien lo subió (o un admin/superadmin) puede borrarlo — evita que cualquiera
        // con acceso de lectura elimine material que no es suyo.
        if ($archivo->subido_por !== $request->user()->id && ! $request->user()->hasAnyRole(['admin', 'superadmin'])) {
            return ApiResponse::error('Solo quien subió el archivo puede eliminarlo.', 403);
        }

        \Illuminate\Support\Facades\Storage::disk('local')->delete($archivo->path);
        $archivo->delete();

        return ApiResponse::success(null, 'Archivo eliminado.');
    }

    // GET /api/planeaciones-docentes/{planeacion}/archivos/{archivo}/descargar
    public function descargarArchivo(Request $request, PlaneacionDocente $planeacionDocente, PlaneacionArchivo $archivo): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        abort_if($archivo->planeacion_docente_id !== $planeacionDocente->id, 404, 'Ese archivo no pertenece a esta planeación.');
        abort_if(! $this->puedeVerComentarios($request, $planeacionDocente), 403, 'No tienes permiso para descargar este archivo.');

        return \Illuminate\Support\Facades\Storage::disk('local')->download($archivo->path, $archivo->nombre_original);
    }

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

    // GET /api/planeaciones-docentes/buscar?q=...  (busca una palabra/frase en TODAS las
    // planeaciones del docente autenticado a la vez — caracterización, intención didáctica,
    // y dentro de cada unidad: nombre, descripción, temas/subtemas, actividades, indicadores,
    // evidencias, fuentes y apoyos didácticos. Se hace en PHP en vez de con una consulta JSON
    // nativa del motor de BD para no atarse a MySQL/Postgres/SQLite — el volumen de
    // planeaciones por docente es pequeño (decenas, no miles), así que no hay problema de
    // rendimiento en traerlas completas y filtrar en memoria.
    public function buscar(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return ApiResponse::success([]);
        }
        $qLower = mb_strtolower($q);
        $contiene = fn (?string $texto) => $texto && str_contains(mb_strtolower($texto), $qLower);

        $planeaciones = PlaneacionDocente::with(['periodo', 'cargaAcademica.materia'])
            ->where('docente_id', $request->user()->id)
            ->get();

        $resultados = [];
        foreach ($planeaciones as $p) {
            $coincidencias = [];

            foreach ([
                'caracterizacion'        => 'Caracterización',
                'intencion_didactica'    => 'Intención didáctica',
                'competencia_asignatura' => 'Competencia de la asignatura',
            ] as $campo => $etiqueta) {
                if ($contiene($p->{$campo})) {
                    $coincidencias[] = ['campo' => $etiqueta, 'unidad' => null, 'texto' => $p->{$campo}];
                }
            }

            foreach (($p->competencias ?? []) as $comp) {
                $unidad = $comp['numero'] ?? null;
                $nombreUnidad = $comp['nombre_unidad'] ?? "Tema {$unidad}";

                if ($contiene($comp['nombre_unidad'] ?? null)) {
                    $coincidencias[] = ['campo' => "Nombre de unidad ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $comp['nombre_unidad']];
                }
                if ($contiene($comp['descripcion'] ?? null)) {
                    $coincidencias[] = ['campo' => "Descripción ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $comp['descripcion']];
                }
                foreach (($comp['subtemas'] ?? []) as $sub) {
                    if ($contiene($sub['texto'] ?? null)) {
                        $coincidencias[] = ['campo' => "Tema/subtema ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $sub['texto']];
                    }
                }
                foreach (($comp['actividades'] ?? []) as $act) {
                    if ($contiene($act['actividad_ensenanza'] ?? null)) {
                        $coincidencias[] = ['campo' => "Actividad de enseñanza ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $act['actividad_ensenanza']];
                    }
                    if ($contiene($act['actividad_aprendizaje'] ?? null)) {
                        $coincidencias[] = ['campo' => "Actividad de aprendizaje ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $act['actividad_aprendizaje']];
                    }
                }
                foreach (($comp['indicadores_alcance'] ?? []) as $ind) {
                    if ($contiene($ind['indicador'] ?? null)) {
                        $coincidencias[] = ['campo' => "Indicador de alcance ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $ind['indicador']];
                    }
                }
                foreach (($comp['matriz_evaluacion'] ?? []) as $fila) {
                    if ($contiene($fila['evidencia'] ?? null)) {
                        $coincidencias[] = ['campo' => "Evidencia de aprendizaje ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $fila['evidencia']];
                    }
                    if ($contiene($fila['evaluacion_formativa'] ?? null)) {
                        $coincidencias[] = ['campo' => "Evaluación formativa ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $fila['evaluacion_formativa']];
                    }
                }
                foreach ((is_array($comp['fuentes_informacion'] ?? null) ? $comp['fuentes_informacion'] : []) as $f) {
                    if ($contiene($f['titulo'] ?? null) || $contiene($f['autor'] ?? null)) {
                        $coincidencias[] = ['campo' => "Fuente de información ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => trim(($f['autor'] ?? '') . ' ' . ($f['titulo'] ?? ''))];
                    }
                }
                foreach ((is_array($comp['apoyos_didacticos'] ?? null) ? $comp['apoyos_didacticos'] : []) as $apoyo) {
                    if ($contiene($apoyo)) {
                        $coincidencias[] = ['campo' => "Apoyo didáctico ({$nombreUnidad})", 'unidad' => $unidad, 'texto' => $apoyo];
                    }
                }
            }

            if (count($coincidencias) === 0) continue;

            $resultados[] = [
                'planeacion_id'      => $p->id,
                'carga_academica_id' => $p->carga_academica_id,
                'materia'            => $p->cargaAcademica?->materia?->nombre,
                'periodo'            => $p->periodo?->nombre,
                'periodo_id'         => $p->periodo_id,
                'coincidencias'      => array_slice($coincidencias, 0, 8),
                'total_coincidencias' => count($coincidencias),
            ];
        }

        return ApiResponse::success($resultados);
    }

    // GET /api/planeaciones-docentes/comparar-grupos?carga_academica_id=X  (docente: compara
    // el avance de dosificación entre todos SUS grupos de la MISMA materia en el mismo
    // periodo — útil cuando da la misma materia a varios grupos y quiere ver cuál va
    // atrasado respecto a los demás, sin tener que abrir cada planeación por separado)
    public function compararGrupos(Request $request): JsonResponse
    {
        $data = $request->validate(['carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id']]);

        $cargaBase = CargaAcademica::findOrFail($data['carga_academica_id']);
        if ($cargaBase->docente_id !== $request->user()->id && ! $request->user()->hasAnyRole(['admin', 'superadmin'])) {
            return ApiResponse::error('Esta carga académica no te pertenece.', 403);
        }

        $cargasHermanas = CargaAcademica::with(['grupos', 'materia'])
            ->where('docente_id', $cargaBase->docente_id)
            ->where('materia_id', $cargaBase->materia_id)
            ->where('periodo_id', $cargaBase->periodo_id)
            ->get();

        $planeaciones = PlaneacionDocente::whereIn('carga_academica_id', $cargasHermanas->pluck('id'))->get()
            ->keyBy('carga_academica_id');

        $periodo = Periodo::find($cargaBase->periodo_id);
        $semanaActual = $this->semanaActualDePeriodo($periodo?->fecha_inicio);

        $filas = $cargasHermanas->map(function ($carga) use ($planeaciones, $semanaActual) {
            $p = $planeaciones->get($carga->id);
            $competencias = $p?->competencias ?? [];

            $totalSubtemas = 0;
            $subtemasConAvance = 0;
            $ultimaSemanaContenido = null;
            foreach ($competencias as $comp) {
                foreach (($comp['dosificacion'] ?? []) as $dos) {
                    $totalSubtemas++;
                    if (($dos['semana_fin'] ?? null) !== null) {
                        $subtemasConAvance++;
                        $ultimaSemanaContenido = max($ultimaSemanaContenido ?? 0, $dos['semana_fin']);
                    }
                }
            }

            return [
                'carga_academica_id'      => $carga->id,
                'grupos'                  => $carga->grupos->pluck('clave')->implode(', ') ?: '—',
                'estatus'                 => $p?->estatus,
                'porcentaje_dosificado'   => $totalSubtemas > 0 ? round($subtemasConAvance / $totalSubtemas * 100) : 0,
                'ultima_semana_contenido' => $ultimaSemanaContenido,
                'semanas_atras_del_lider' => null, // se calcula abajo, tras conocer el máximo
            ];
        });

        $maxSemana = $filas->max('ultima_semana_contenido');
        $filas = $filas->map(function ($f) use ($maxSemana, $semanaActual) {
            $f['semanas_atras_del_lider'] = $maxSemana !== null && $f['ultima_semana_contenido'] !== null
                ? $maxSemana - $f['ultima_semana_contenido']
                : null;
            return $f;
        })->sortByDesc('ultima_semana_contenido')->values();

        return ApiResponse::success([
            'materia'        => $cargaBase->materia?->nombre,
            'semana_actual'  => $semanaActual,
            'total_semanas'  => self::TOTAL_SEMANAS,
            'grupos'         => $filas,
        ]);
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

        // Se archiva el estado previo a este guardado (si ya existía la planeación) ANTES de
        // sobrescribirlo — guardarVersionSiCambio no duplica si no hubo cambio real desde el
        // último snapshot, así que el autoguardado frecuente del editor no genera ruido.
        $existente = PlaneacionDocente::where('carga_academica_id', $data['carga_academica_id'])
            ->where('periodo_id', $data['periodo_id'])->first();
        if ($existente) {
            $this->guardarVersionSiCambio($existente, 'autoguardado', $request->user()->id);
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

    // POST /api/planeaciones-docentes/{planeacion}/clonar  (reutilizar una instrumentación
    // ya liberada como borrador para una carga académica del periodo actual — evita
    // recapturar caracterización/competencias/dosificación desde cero cada semestre)
    public function clonar(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if ($planeacionDocente->docente_id !== $request->user()->id
            && ! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            return ApiResponse::error('Solo puedes clonar tus propias planeaciones.', 403);
        }

        if ($planeacionDocente->estatus !== 'liberada') {
            return ApiResponse::error('Solo se pueden clonar planeaciones ya liberadas.', 422);
        }

        $data = $request->validate([
            'carga_academica_id' => ['required', 'uuid', 'exists:cargas_academicas,id'],
            'periodo_id'          => ['required', 'uuid', 'exists:periodos,id'],
        ]);

        $carga = CargaAcademica::findOrFail($data['carga_academica_id']);
        if ($carga->docente_id !== $planeacionDocente->docente_id
            && ! $request->user()->hasAnyRole(['superadmin', 'admin'])) {
            return ApiResponse::error('Esa carga académica no pertenece a este docente.', 403);
        }

        if (PlaneacionDocente::where('carga_academica_id', $data['carga_academica_id'])
            ->where('periodo_id', $data['periodo_id'])->exists()) {
            return ApiResponse::error('Ya existe una planeación para esa materia en ese periodo.', 422);
        }

        // Se limpia la confirmación de avance de DA (semana_realizado) y las fechas de
        // envío/revisión — son propias del ciclo anterior y no aplican al nuevo periodo.
        // Las semanas de dosificación (semana_inicio/semana_fin) las recalcula solo el
        // editor al cargar (generarDosificacionAutomatica), así que no hace falta tocarlas.
        $competencias = collect($planeacionDocente->competencias ?? [])->map(function ($competencia) {
            $competencia['dosificacion'] = collect($competencia['dosificacion'] ?? [])
                ->map(function ($d) {
                    $d['semana_realizado'] = null;
                    return $d;
                })->all();
            return $competencia;
        })->all();

        $clon = PlaneacionDocente::create([
            'carga_academica_id'      => $data['carga_academica_id'],
            'docente_id'              => $carga->docente_id,
            'periodo_id'              => $data['periodo_id'],
            'estatus'                 => 'borrador',
            'caracterizacion'         => $planeacionDocente->caracterizacion,
            'intencion_didactica'     => $planeacionDocente->intencion_didactica,
            'competencia_asignatura'  => $planeacionDocente->competencia_asignatura,
            'competencias'            => $competencias,
            'fuentes_informacion'     => $planeacionDocente->fuentes_informacion,
            'apoyos_didacticos'       => $planeacionDocente->apoyos_didacticos,
        ]);

        return ApiResponse::success(
            $clon->fresh(['cargaAcademica.materia', 'periodo']),
            'Planeación clonada como borrador.',
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

        $this->guardarVersionSiCambio($planeacionDocente, 'envio', $request->user()->id);

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

        // Además de guardarse en observaciones_campos (que el docente ve mientras la
        // planeación sigue devuelta, pero que se limpia en el siguiente reenvío), cada
        // observación anclada abre/continúa un hilo permanente de comentarios — así la
        // conversación sobrevive al reenvío y el docente puede responder ahí mismo.
        foreach (($data['observaciones_campos'] ?? []) as $obs) {
            PlaneacionComentario::where('planeacion_docente_id', $planeacionDocente->id)
                ->where('seccion', $obs['seccion'])
                ->where('unidad', $obs['unidad'] ?? null)
                ->where('categoria', $obs['categoria'] ?? null)
                ->update(['resuelto' => false]);

            PlaneacionComentario::create([
                'planeacion_docente_id' => $planeacionDocente->id,
                'autor_id'              => $request->user()->id,
                'seccion'               => $obs['seccion'],
                'unidad'                => $obs['unidad'] ?? null,
                'categoria'             => $obs['categoria'] ?? null,
                'mensaje'               => $obs['texto'],
                'resuelto'              => false,
            ]);
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

    // Roles autorizados para registrar el avance real de la dosificación (semana_realizado)
    // en el corte — el docente solo programa semana_inicio/semana_fin; el avance real lo
    // confirma Desarrollo Académico (o admin/superadmin) para que quede como un dato
    // verificado y no autorreportado.
    private const ROLES_AVANCE_DOSIFICACION = ['desarrollo_academico', 'admin', 'superadmin'];

    // PATCH /api/planeaciones-docentes/{planeacion}/dosificacion  (Desarrollo Académico marca el avance real)
    public function actualizarDosificacion(Request $request, PlaneacionDocente $planeacionDocente): JsonResponse
    {
        if (! $request->user()->hasAnyRole(self::ROLES_AVANCE_DOSIFICACION)) {
            return ApiResponse::error('No tienes permiso para registrar el avance de dosificación.', 403);
        }

        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $planeacionDocente->loadMissing('cargaAcademica.grupos');
            abort_if(
                $planeacionDocente->cargaAcademica?->grupos?->contains(fn($g) => $g->carrera_id !== $carreraForzada) ?? true,
                403,
                'Sin acceso a planeaciones de otras carreras.'
            );
        }

        $data = $request->validate([
            'avances'                    => ['required', 'array', 'min:1'],
            'avances.*.unidad'           => ['required', 'integer'],
            'avances.*.index'            => ['required', 'integer', 'min:0'],
            'avances.*.semana_realizado' => ['nullable', 'integer', 'min:1', 'max:16'],
        ]);

        $competencias = $planeacionDocente->competencias ?? [];
        foreach ($data['avances'] as $avance) {
            foreach ($competencias as &$competencia) {
                if (($competencia['numero'] ?? null) !== $avance['unidad']) continue;
                if (! isset($competencia['dosificacion'][$avance['index']])) continue;
                $competencia['dosificacion'][$avance['index']]['semana_realizado'] = $avance['semana_realizado'];
            }
            unset($competencia);
        }

        $planeacionDocente->update(['competencias' => $competencias]);

        return ApiResponse::success($planeacionDocente->fresh(), 'Avance de dosificación actualizado.');
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

    private const TOTAL_SEMANAS = 16;

    // GET /api/planeaciones-docentes/seguimiento  (dashboard cross-materia para Desarrollo
    // Académico/Jefatura de Carrera: unidades con dosificación atrasada respecto a la
    // semana actual del periodo, y evaluaciones vencidas sin señal de calificación cargada)
    public function seguimiento(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            return ApiResponse::error('No tienes permiso para ver este seguimiento.', 403);
        }

        return ApiResponse::success($this->construirSeguimiento($request));
    }

    // GET /api/planeaciones-docentes/seguimiento/pdf  (mismo contenido del dashboard,
    // para que DA/Jefatura lo lleve impreso a junta de academia)
    public function seguimientoPdf(Request $request): \Illuminate\Http\Response
    {
        if (! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            abort(403, 'No tienes permiso para ver este seguimiento.');
        }

        $datos = $this->construirSeguimiento($request);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.seguimiento_instrumentacion', $datos)
            ->setPaper('letter', 'landscape');

        return $pdf->download('seguimiento_instrumentacion.pdf');
    }

    // GET /api/planeaciones-docentes/mi-comparativo  (vista docente: mi % de cumplimiento
    // de dosificación vs el promedio anónimo de mi(s) carrera(s) — sin exponer datos de
    // otros docentes en particular, solo el promedio del grupo)
    public function miComparativo(Request $request): JsonResponse
    {
        $docenteId = $request->user()->id;
        $periodoId = $request->query('periodo_id');

        $misPlaneaciones = PlaneacionDocente::with('cargaAcademica.grupos')
            ->where('docente_id', $docenteId)
            ->where('estatus', 'liberada')
            ->when($periodoId, fn ($q, $v) => $q->where('periodo_id', $v))
            ->whereHas('periodo', fn ($q) => $q->whereNotNull('fecha_inicio'))
            ->get();

        $carreraIds = $misPlaneaciones
            ->flatMap(fn ($p) => $p->cargaAcademica?->grupos?->pluck('carrera_id') ?? [])
            ->filter()->unique()->values();

        if ($carreraIds->isEmpty()) {
            return ApiResponse::success(['mi_porcentaje' => null, 'promedio_academia' => null, 'total_docentes_academia' => 0]);
        }

        $planeacionesAcademia = PlaneacionDocente::with(['cargaAcademica.grupos', 'periodo'])
            ->where('estatus', 'liberada')
            ->whereHas('cargaAcademica.grupos', fn ($q) => $q->whereIn('carrera_id', $carreraIds))
            ->when($periodoId, fn ($q, $v) => $q->where('periodo_id', $v))
            ->whereHas('periodo', fn ($q) => $q->whereNotNull('fecha_inicio'))
            ->get();

        $porDocente = [];
        foreach ($planeacionesAcademia as $planeacion) {
            $semanaActual = $this->semanaActualDePeriodo($planeacion->periodo?->fecha_inicio);
            if ($semanaActual === null) continue;

            foreach (($planeacion->competencias ?? []) as $competencia) {
                $finesSemana = array_values(array_filter(array_map(
                    fn ($d) => $d['semana_fin'] ?? null,
                    $competencia['dosificacion'] ?? []
                ), fn ($s) => $s !== null));
                $ultimaSemanaContenido = $finesSemana ? max($finesSemana) : null;
                $atrasada = $ultimaSemanaContenido !== null && $ultimaSemanaContenido < $semanaActual;

                $porDocente[$planeacion->docente_id] ??= ['total' => 0, 'con_atraso' => 0];
                $porDocente[$planeacion->docente_id]['total']++;
                if ($atrasada) $porDocente[$planeacion->docente_id]['con_atraso']++;
            }
        }

        $porcentajes = collect($porDocente)->map(fn ($d) => $d['total'] > 0 ? (1 - $d['con_atraso'] / $d['total']) * 100 : 100);

        return ApiResponse::success([
            'mi_porcentaje' => $porcentajes->has($docenteId) ? round($porcentajes->get($docenteId)) : null,
            'promedio_academia' => $porcentajes->isNotEmpty() ? round($porcentajes->avg()) : null,
            'total_docentes_academia' => $porcentajes->count(),
        ]);
    }

    private function construirSeguimiento(Request $request): array
    {
        $carreraForzada = $request->user()->carreraRestringida();

        $planeaciones = PlaneacionDocente::with(['docente', 'periodo', 'cargaAcademica.materia', 'cargaAcademica.grupos.carrera'])
            ->where('estatus', 'liberada')
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('cargaAcademica.grupos', fn($gq) => $gq->where('carrera_id', $v))
            )
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->whereHas('periodo', fn ($q) => $q->whereNotNull('fecha_inicio'))
            ->get();

        // Para "vista docente" de calificaciones reales por unidad: cuento qué números de
        // parcial ya tienen al menos una calificación capturada, por carga académica —
        // así puedo confirmar si una "evaluación vencida" ya se resolvió en la práctica.
        $cargaIds = $planeaciones->pluck('carga_academica_id')->filter()->unique()->values();
        $parcialesCapturadosPorCarga = Calificacion::whereIn('carga_academica_id', $cargaIds)
            ->whereNotNull('parciales')
            ->get(['carga_academica_id', 'parciales'])
            ->groupBy('carga_academica_id')
            ->map(fn ($grupo) => $grupo->flatMap(fn ($c) => collect($c->parciales)->pluck('parcial'))
                ->map(fn ($p) => (int) $p)->unique()->values()->all());

        $filas = [];
        $porUnidadDocente = []; // docente_id => ['nombre'=>, 'total_unidades'=>, 'con_atraso'=>]
        $porDocenteSemana = []; // docente_id|semana_evaluacion => count

        foreach ($planeaciones as $planeacion) {
            $semanaActual = $this->semanaActualDePeriodo($planeacion->periodo?->fecha_inicio);
            if ($semanaActual === null) continue;

            $competencias = $planeacion->competencias ?? [];
            $ultimaIdx = count($competencias) - 1;
            $parcialesCapturados = $parcialesCapturadosPorCarga->get($planeacion->carga_academica_id, []);

            foreach ($competencias as $i => $competencia) {
                $numeroUnidad = $competencia['numero'] ?? ($i + 1);
                $dosificacion = $competencia['dosificacion'] ?? [];

                $finesSemana = array_values(array_filter(array_map(
                    fn ($d) => $d['semana_fin'] ?? null,
                    $dosificacion
                ), fn ($s) => $s !== null));
                $ultimaSemanaContenido = $finesSemana ? max($finesSemana) : null;

                $atrasoDosificacion = $ultimaSemanaContenido !== null && $ultimaSemanaContenido < $semanaActual
                    ? $semanaActual - $ultimaSemanaContenido
                    : 0;

                $semanaEvaluacion = $ultimaSemanaContenido !== null
                    ? min(self::TOTAL_SEMANAS, $ultimaSemanaContenido + 1)
                    : null;
                $evaluacionVencida = $semanaEvaluacion !== null && $semanaEvaluacion < $semanaActual;

                // Métricas agregadas por docente: cuento TODAS las unidades liberadas (no
                // solo las que tienen problema) para poder calcular % de cumplimiento.
                $docenteId = $planeacion->docente_id;
                if ($docenteId) {
                    $porUnidadDocente[$docenteId] ??= ['nombre' => $planeacion->docente?->name, 'total_unidades' => 0, 'con_atraso' => 0];
                    $porUnidadDocente[$docenteId]['total_unidades']++;
                    if ($atrasoDosificacion > 0 || $evaluacionVencida) {
                        $porUnidadDocente[$docenteId]['con_atraso']++;
                    }

                    if ($semanaEvaluacion !== null) {
                        $clave = "{$docenteId}|{$semanaEvaluacion}";
                        $porDocenteSemana[$clave] ??= ['docente' => $planeacion->docente?->name, 'semana_evaluacion' => $semanaEvaluacion, 'materias' => []];
                        $porDocenteSemana[$clave]['materias'][] = $planeacion->cargaAcademica?->materia?->nombre;
                    }
                }

                if ($atrasoDosificacion <= 0 && ! $evaluacionVencida) continue;

                // Desfase declarado: la unidad tiene semanas confirmadas por DA
                // (semana_realizado) que difieren de lo calculado — señal de que el avance
                // real no coincide con lo que el docente dosificó.
                $semanasRealizado = array_values(array_filter(array_map(
                    fn ($d) => $d['semana_realizado'] ?? null,
                    $dosificacion
                ), fn ($s) => $s !== null));
                $desfaseDeclarado = $semanasRealizado && $ultimaSemanaContenido !== null
                    && max($semanasRealizado) !== $ultimaSemanaContenido;

                $claveDedup = "recordatorio-evaluacion:{$planeacion->id}:{$numeroUnidad}";

                $filas[] = [
                    'planeacion_id' => $planeacion->id,
                    'docente' => $planeacion->docente?->name,
                    'materia' => $planeacion->cargaAcademica?->materia?->nombre,
                    'periodo' => $planeacion->periodo?->nombre,
                    'unidad' => $numeroUnidad,
                    'nombre_unidad' => $competencia['nombre_unidad'] ?? '',
                    'semana_actual' => $semanaActual,
                    'ultima_semana_contenido' => $ultimaSemanaContenido,
                    'atraso_dosificacion_semanas' => $atrasoDosificacion,
                    'semana_evaluacion' => $semanaEvaluacion,
                    'evaluacion_vencida' => $evaluacionVencida,
                    'tipo' => $i === $ultimaIdx ? 'ES' : 'EF',
                    'recordatorio_enviado' => Cache::has($claveDedup),
                    'desfase_declarado' => $desfaseDeclarado,
                    'tiene_calificaciones_capturadas' => in_array($numeroUnidad, $parcialesCapturados, true),
                ];
            }
        }

        usort($filas, fn ($a, $b) =>
            ($b['atraso_dosificacion_semanas'] + ($b['evaluacion_vencida'] ? 100 : 0))
            <=> ($a['atraso_dosificacion_semanas'] + ($a['evaluacion_vencida'] ? 100 : 0))
        );

        $resumenDocentes = collect($porUnidadDocente)
            ->map(fn ($d, $docenteId) => [
                'docente_id' => $docenteId,
                'docente' => $d['nombre'],
                'total_unidades' => $d['total_unidades'],
                'unidades_con_atraso' => $d['con_atraso'],
                'porcentaje_cumplimiento' => $d['total_unidades'] > 0
                    ? round((1 - $d['con_atraso'] / $d['total_unidades']) * 100)
                    : 100,
            ])
            ->sortBy('porcentaje_cumplimiento')
            ->values();

        $cargaTrabajo = collect($porDocenteSemana)
            ->map(fn ($d) => [
                'docente' => $d['docente'],
                'semana_evaluacion' => $d['semana_evaluacion'],
                'materias' => array_values(array_unique(array_filter($d['materias']))),
                'cantidad' => count(array_unique(array_filter($d['materias']))),
            ])
            ->filter(fn ($d) => $d['cantidad'] >= 2)
            ->sortByDesc('cantidad')
            ->values();

        return [
            'total_atrasos' => count(array_filter($filas, fn ($f) => $f['atraso_dosificacion_semanas'] > 0)),
            'total_evaluaciones_vencidas' => count(array_filter($filas, fn ($f) => $f['evaluacion_vencida'])),
            'filas' => $filas,
            'resumen_docentes' => $resumenDocentes,
            'carga_trabajo' => $cargaTrabajo,
        ];
    }

    // GET /api/planeaciones-docentes/acreditacion-por-carrera  (para acreditación TecNM:
    // % de instrumentaciones didácticas liberadas por carrera, del periodo indicado)
    public function acreditacionPorCarrera(Request $request): JsonResponse
    {
        if (! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            return ApiResponse::error('No tienes permiso para ver este panel.', 403);
        }

        $carreraForzada = $request->user()->carreraRestringida();

        $planeaciones = PlaneacionDocente::with(['cargaAcademica.grupos.carrera'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('cargaAcademica.grupos', fn($gq) => $gq->where('carrera_id', $v))
            )
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->get();

        $porCarrera = [];
        foreach ($planeaciones as $planeacion) {
            $carrera = $planeacion->cargaAcademica?->grupos?->first()?->carrera;
            if (! $carrera) continue;

            $porCarrera[$carrera->id] ??= ['carrera' => $carrera->nombre, 'total' => 0, 'liberadas' => 0];
            $porCarrera[$carrera->id]['total']++;
            if ($planeacion->estatus === 'liberada') {
                $porCarrera[$carrera->id]['liberadas']++;
            }
        }

        $resultado = collect($porCarrera)
            ->map(fn ($c) => [
                'carrera' => $c['carrera'],
                'total' => $c['total'],
                'liberadas' => $c['liberadas'],
                'porcentaje_liberadas' => $c['total'] > 0 ? round($c['liberadas'] / $c['total'] * 100) : 0,
            ])
            ->sortBy('porcentaje_liberadas')
            ->values();

        return ApiResponse::success($resultado);
    }

    /** Misma fórmula que semanaActualDePeriodo() en el frontend (planeacionCatalogo.ts). */
    private function semanaActualDePeriodo(?string $fechaInicioPeriodo): ?int
    {
        if (! $fechaInicioPeriodo) return null;
        $inicio = Carbon::parse($fechaInicioPeriodo)->startOfDay();
        $dias = $inicio->diffInDays(now()->startOfDay(), false);
        if ($dias < 0) return null;
        return min(self::TOTAL_SEMANAS, intdiv((int) $dias, 7) + 1);
    }

    // GET /api/planeaciones-docentes/{planeacion}/pdf-calendario  (Calendario de horas +
    // Calendarización de evaluación, para imprimir/archivar — mismo cálculo que el frontend)
    public function pdfCalendario(Request $request, PlaneacionDocente $planeacionDocente): \Illuminate\Http\Response
    {
        $esDueño = $planeacionDocente->docente_id === $request->user()->id;
        if (! $esDueño && ! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            abort(403, 'No tienes permiso para descargar esta planeación.');
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

        $planeacionDocente->loadMissing(['docente', 'periodo', 'cargaAcademica.materia']);
        $competencias = $planeacionDocente->competencias ?? [];
        $fechaInicioPeriodo = $planeacionDocente->periodo?->fecha_inicio;

        $semanas = [];
        for ($s = 1; $s <= self::TOTAL_SEMANAS; $s++) {
            $semanas[$s] = [
                'semana' => $s,
                'fechas' => $this->rangoFechasSemana($fechaInicioPeriodo, $s),
                'teoria' => 0.0,
                'practica' => 0.0,
                'temas' => [],
            ];
        }

        foreach ($competencias as $competencia) {
            $actividadesPorFila = collect($competencia['actividades'] ?? [])->keyBy('numero');
            foreach (($competencia['dosificacion'] ?? []) as $dos) {
                if (empty($dos['subtema']) || $dos['semana_inicio'] === null || $dos['semana_fin'] === null) continue;
                $fila = collect($competencia['subtemas'] ?? [])->firstWhere('texto', $dos['subtema'])['fila'] ?? null;
                $actividad = $fila !== null ? $actividadesPorFila->get($fila) : null;

                $inicio = max(1, min($dos['semana_inicio'], $dos['semana_fin']));
                $fin = min(self::TOTAL_SEMANAS, max($dos['semana_inicio'], $dos['semana_fin']));
                $n = $fin - $inicio + 1;
                if ($n <= 0) continue;

                $teoriaSemana = $actividad ? ($actividad['horas_teoricas'] ?? 0) / $n : 0;
                $practicaSemana = $actividad ? ($actividad['horas_practicas'] ?? 0) / $n : 0;
                $etiqueta = "{$dos['subtema']} (Tema {$competencia['numero']})";

                for ($s = $inicio; $s <= $fin; $s++) {
                    $semanas[$s]['teoria'] += $teoriaSemana;
                    $semanas[$s]['practica'] += $practicaSemana;
                    $semanas[$s]['temas'][] = $etiqueta;
                }
            }
        }

        $evaluaciones = $this->calcularEvaluaciones($competencias, $fechaInicioPeriodo);

        $dosificacion = [];
        foreach ($competencias as $competencia) {
            foreach (($competencia['subtemas'] ?? []) as $sub) {
                $dos = collect($competencia['dosificacion'] ?? [])->firstWhere('subtema', $sub['texto'] ?? null);
                $semanaInicio = $dos['semana_inicio'] ?? null;
                $semanaFin = $dos['semana_fin'] ?? null;
                $semanaRealizado = $dos['semana_realizado'] ?? null;

                $estado = 'pendiente';
                if ($semanaRealizado !== null) {
                    if ($semanaInicio !== null && $semanaRealizado < $semanaInicio) $estado = 'adelantado';
                    elseif ($semanaFin !== null && $semanaRealizado > $semanaFin) $estado = 'atraso';
                    else $estado = 'a_tiempo';
                }

                $dosificacion[] = [
                    'unidad' => $competencia['numero'],
                    'nombre_unidad' => $competencia['nombre_unidad'] ?? '',
                    'subtema' => $sub['texto'] ?? '',
                    'semana_inicio' => $semanaInicio,
                    'semana_fin' => $semanaFin,
                    'semana_realizado' => $semanaRealizado,
                    'estado' => $estado,
                ];
            }
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.planeacion_calendario', [
            'planeacion' => $planeacionDocente,
            'semanas' => $semanas,
            'evaluaciones' => $evaluaciones,
            'dosificacion' => $dosificacion,
        ])->setPaper('letter', 'landscape');

        $materia = $planeacionDocente->cargaAcademica?->materia?->nombre ?? 'planeacion';
        return $pdf->download("calendario_{$materia}.pdf");
    }

    // GET /api/planeaciones-docentes/{planeacion}/pdf-instrumentacion  (documento completo en
    // el formato oficial "Instrumentación Didáctica para la formación y desarrollo de
    // competencias profesionales", TecNM-AC-PO-003-02)
    public function pdfInstrumentacion(Request $request, PlaneacionDocente $planeacionDocente): \Illuminate\Http\Response
    {
        $esDueño = $planeacionDocente->docente_id === $request->user()->id;
        if (! $esDueño && ! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            abort(403, 'No tienes permiso para descargar esta planeación.');
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

        $datos = $this->datosInstrumentacion($request, $planeacionDocente);

        $nombre = 'instrumentacion_didactica_' . ($datos['asignatura'] ?: 'planeacion') . '.pdf';

        // Chromium (Gotenberg) reproduce el formato del SGC como Word: parte las filas largas
        // entre páginas y repite el encabezado de la tabla. dompdf no puede partir una fila de
        // tabla y deja páginas a medio llenar, así que solo se usa si Gotenberg no responde.
        try {
            $contenido = app(\App\Services\GotenbergService::class)->htmlToPdf(
                view('pdfs.planeacion_instrumentacion', ['d' => $datos, 'motor' => 'chromium'])->render(),
                [
                    // Carta horizontal; márgenes del formato (2.5 cm izq., 2 cm der./inf.) y
                    // espacio superior para el encabezado.
                    'paperWidth' => '11in', 'paperHeight' => '8.5in',
                    'marginTop' => '1.47in', 'marginBottom' => '0.79in',
                    'marginLeft' => '0.98in', 'marginRight' => '0.79in',
                ],
                view('pdfs.partials.instrumentacion_encabezado_pagina', ['d' => $datos])->render()
            );
            return response($contenido, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $nombre . '"',
            ]);
        } catch (\RuntimeException $e) {
            report($e);
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.planeacion_instrumentacion', ['d' => $datos, 'motor' => 'dompdf'])
            ->setPaper('letter', 'landscape');

        return $pdf->download($nombre);
    }

    // GET /api/planeaciones-docentes/{planeacion}/docx-instrumentacion  (mismo contenido que
    // el PDF oficial, pero en .docx editable — para el docente que necesite ajustar redacción
    // fuera del sistema y volver a pegarla, o entregarlo a alguien que solo maneje Word)
    public function docxInstrumentacion(Request $request, PlaneacionDocente $planeacionDocente): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $esDueño = $planeacionDocente->docente_id === $request->user()->id;
        if (! $esDueño && ! $request->user()->hasAnyRole([
            'superadmin', 'admin', 'director_academico', 'subdireccion_academica', 'jefe_carrera', 'desarrollo_academico',
        ])) {
            abort(403, 'No tienes permiso para descargar esta planeación.');
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

        $d = $this->datosInstrumentacion($request, $planeacionDocente);
        $cfg = \App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia();

        // PhpWord::addText() no escapa entidades XML por su cuenta — un valor con "<", ">" o
        // "&" rompe el XML interno del .docx y Word lo reporta como archivo dañado.
        $esc = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES | ENT_XML1, 'UTF-8');
        // addText() no interpreta HTML: el texto del editor enriquecido se reduce a texto
        // plano conservando viñetas y saltos de línea.
        $plano = fn ($v) => RichText::aPlano($v);

        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $phpWord->setDefaultFontName('Arial');
        $phpWord->setDefaultFontSize(12);

        // Formato oficial: carta horizontal, márgenes 2.5 / 2 cm.
        $ANCHO = 13290; // ancho útil en twips (15842 - 1418 - 1134)
        $section = $phpWord->addSection([
            'orientation' => 'landscape',
            'pageSizeW' => 15842, 'pageSizeH' => 12242,
            'marginLeft' => 1418, 'marginRight' => 1134, 'marginTop' => 1418, 'marginBottom' => 1134,
            'headerHeight' => 568,
        ]);

        $borde = ['borderSize' => 6, 'borderColor' => '000000', 'cellMargin' => 70];
        $b = ['bold' => true];
        $centro = ['alignment' => 'center', 'spaceAfter' => 0];
        $parr = ['spaceAfter' => 0];
        $encab = ['valign' => 'center']; // el formato oficial no sombrea encabezados

        // Texto de varias líneas en una celda (PhpWord no respeta "\n" dentro de addText).
        $lineas = function ($celda, ?string $texto, array $fuente = [], array $p = []) use ($esc, $parr) {
            $renglones = preg_split('/\r?\n/', (string) $texto);
            foreach ($renglones as $r) {
                $celda->addText($esc($r), $fuente, $p ?: $parr);
            }
        };

        // Encabezado en todas las páginas: logo TecNM | título | logo del instituto.
        $header = $section->addHeader();
        $th = $header->addTable(['borderSize' => 0, 'cellMargin' => 40]);
        $th->addRow();
        $logoTec = resource_path('images/logo-tecnm.png'); // fijo del formato del SGC
        $logoInst = $cfg->rutaLogoRaster('principal');
        $c = $th->addCell(3000, ['valign' => 'center']);
        if ($logoTec) $c->addImage($logoTec, ['height' => 40, 'alignment' => 'left']);
        $th->addCell($ANCHO - 4500, ['valign' => 'center'])
            ->addText($esc('Instrumentación Didáctica para la formación y desarrollo de competencias profesionales-Ingreso Agosto 2015 del SGI del G4'), ['bold' => true, 'size' => 12], $centro);
        $c = $th->addCell(1500, ['valign' => 'center']);
        if ($logoInst) $c->addImage($logoInst, ['height' => 48, 'alignment' => 'right']);

        // Título y periodo
        $t = $section->addTable($borde);
        $t->addRow();
        $t->addCell($ANCHO, ['gridSpan' => 2, 'bgColor' => 'D9D9D9'])
            ->addText($esc('Instrumentación didáctica para la formación y desarrollo de competencias profesionales'), ['bold' => true, 'size' => 12], $centro);
        $t->addRow();
        $t->addCell(2000)->addText('Periodo', $b, $parr);
        $t->addCell($ANCHO - 2000)->addText($esc($d['periodo']), [], $parr);
        $section->addTextBreak(1, ['size' => 6]);

        // Datos de la asignatura
        $t = $section->addTable($borde);
        foreach ([
            ['Nombre de la asignatura:', $d['asignatura']],
            ['Plan de estudios:', $d['plan']],
            ['Clave de la asignatura:', $d['clave']],
            ['Horas teoría-Horas práctica-Créditos:', $d['horas']],
        ] as [$etq, $val]) {
            $t->addRow();
            $t->addCell(4200)->addText($esc($etq), $b, $parr);
            $t->addCell($ANCHO - 4200)->addText($esc($val), [], $parr);
        }

        $seccion = function (string $titulo, $contenido) use ($section, $esc, $plano, $borde, $ANCHO, $lineas) {
            $section->addTextBreak(1, ['size' => 6]);
            $section->addText($esc($titulo), ['bold' => true, 'size' => 11], ['spaceAfter' => 60]);
            $t = $section->addTable($borde);
            $t->addRow();
            $lineas($t->addCell($ANCHO), $plano($contenido) ?: '');
        };
        $seccion('1. Caracterización de la asignatura  (1)', $d['caracterizacion']);
        $seccion('2. Intención didáctica  (2)', $d['intencion']);
        $seccion('3. Competencia de la asignatura  (3)', $d['competencia']);

        // 4. Análisis por competencias específicas (se repite por cada tema)
        foreach ($d['competencias'] as $comp) {
            $section->addPageBreak();
            $section->addText($esc('4. Análisis por competencias especificas'), ['bold' => true, 'size' => 11], ['spaceAfter' => 60]);

            $t = $section->addTable($borde);
            $t->addRow();
            $t->addCell(2200, $encab)->addText('Competencia No. (4.1)', [], $parr);
            $t->addCell(900)->addText($esc($comp['numero']), [], $centro);
            $t->addCell(1600, $encab)->addText($esc('Descripción: (4.2)'), [], $parr);
            $celda = $t->addCell($ANCHO - 4700);
            if ($comp['nombre'] !== '') $celda->addText($esc($comp['nombre']), $b, $parr);
            $lineas($celda, $plano($comp['descripcion']) ?: '');
            $section->addTextBreak(1, ['size' => 6]);

            $anchos = [3000, 2900, 2900, 2690, 1800];
            $t = $section->addTable($borde);
            $t->addRow(null, ['tblHeader' => true]);
            foreach ([
                'Temas y Subtemas para desarrollar la competencia especifica (4.3)',
                'Actividades de aprendizaje (4.4)', 'Actividades de enseñanza (4.5)',
                'Desarrollo de competencias genéricas (4.6)', 'Horas teórico-prácticas (4.7)',
            ] as $k => $h) {
                $t->addCell($anchos[$k], $encab)->addText($esc($h), ['bold' => true, 'size' => 9], $centro);
            }
            $filas = $comp['filas'] ?: [['subtemas' => [], 'aprendizaje' => '', 'ensenanza' => '', 'horas' => '']];
            foreach ($filas as $k => $f) {
                $t->addRow();
                $lineas($t->addCell($anchos[0]), implode("\n", $f['subtemas']), ['size' => 9]);
                $lineas($t->addCell($anchos[1]), $plano($f['aprendizaje']), ['size' => 9]);
                $lineas($t->addCell($anchos[2]), $plano($f['ensenanza']), ['size' => 9]);
                // Las genéricas son de toda la competencia: se muestran en una celda combinada.
                if ($k === 0) {
                    $lineas($t->addCell($anchos[3], count($filas) > 1 ? ['vMerge' => 'restart'] : []), implode("\n", $comp['genericas']), ['size' => 9]);
                } else {
                    $t->addCell($anchos[3], ['vMerge' => 'continue']);
                }
                $t->addCell($anchos[4])->addText($esc($f['horas']), ['size' => 9], $centro);
            }
            $section->addTextBreak(1, ['size' => 6]);

            $t = $section->addTable($borde);
            $t->addRow();
            $t->addCell($ANCHO - 2500, $encab)->addText('Indicadores de alcance  (4.8)', [], $parr);
            $t->addCell(2500, $encab)->addText('Valor del indicador  (4.9)', [], $parr);
            foreach ($comp['indicadores'] ?: [['letra' => '', 'indicador' => '', 'valor' => '']] as $ind) {
                $t->addRow();
                $t->addCell($ANCHO - 2500)->addText($esc(trim($ind['letra'] . '. ' . $ind['indicador'], '. ')), ['size' => 9], $parr);
                $t->addCell(2500)->addText($esc($ind['valor'] ?? ''), ['size' => 9], $centro);
            }
            $section->addTextBreak(1, ['size' => 6]);

            $section->addText($esc('Niveles de desempeño  (4.10)'), [], ['spaceAfter' => 60]);
            $t = $section->addTable($borde);
            $t->addRow();
            foreach (['Desempeño' => 2600, 'Nivel de desempeño' => 2200, 'Indicadores de alcance' => $ANCHO - 7200, 'Valoración numérica' => 2400] as $h => $w) {
                $t->addCell($w, $encab)->addText($esc($h), $b, $centro);
            }
            foreach ($comp['niveles'] as $k => $niv) {
                $t->addRow();
                if ($k === 0) {
                    $t->addCell(2600, ['vMerge' => 'restart', 'valign' => 'center'])->addText('Competencia alcanzada', ['size' => 9], $centro);
                } elseif ($niv['nivel'] !== 'Insuficiente') {
                    $t->addCell(2600, ['vMerge' => 'continue']);
                } else {
                    $t->addCell(2600, ['valign' => 'center'])->addText('Competencia no alcanzada', ['size' => 9], $centro);
                }
                $t->addCell(2200)->addText($esc($niv['nivel']), ['size' => 9], $centro);
                $lineas($t->addCell($ANCHO - 7200), $niv['indicadores'], ['size' => 9]);
                $t->addCell(2400)->addText($esc($niv['valoracion']), ['size' => 9], $centro);
            }
            $section->addTextBreak(1, ['size' => 6]);

            $section->addText($esc('Matriz de evaluación  (4.11)'), [], ['spaceAfter' => 60]);
            $letras = $comp['letras'] ?: ['A', 'B', 'C', 'N'];
            $wLetra = 700;
            $wFormativa = 3200;
            $wEvid = $ANCHO - 900 - $wFormativa - $wLetra * count($letras);
            $t = $section->addTable($borde);
            $t->addRow();
            $t->addCell($wEvid, $encab + ['vMerge' => 'restart'])->addText('Evidencia de aprendizaje', $b, $centro);
            $t->addCell(900, $encab + ['vMerge' => 'restart'])->addText('%', $b, $centro);
            $t->addCell($wLetra * count($letras), $encab + ['gridSpan' => count($letras)])->addText('Indicador de alcance', $b, $centro);
            $t->addCell($wFormativa, $encab + ['vMerge' => 'restart'])->addText('Evaluación formativa de la competencia', $b, $centro);
            $t->addRow();
            $t->addCell($wEvid, ['vMerge' => 'continue']);
            $t->addCell(900, ['vMerge' => 'continue']);
            foreach ($letras as $l) $t->addCell($wLetra, $encab)->addText($esc($l), $b, $centro);
            $t->addCell($wFormativa, ['vMerge' => 'continue']);
            foreach ($comp['matriz'] as $f) {
                $t->addRow();
                $t->addCell($wEvid)->addText($esc($f['evidencia']), ['size' => 9], $parr);
                $t->addCell(900)->addText($esc($f['porcentaje'] ?? ''), ['size' => 9], $centro);
                foreach ($letras as $k => $l) {
                    $t->addCell($wLetra)->addText(!empty($f['marcas'][$k]) ? 'X' : '', ['size' => 9], $centro);
                }
                $lineas($t->addCell($wFormativa), $f['formativa'], ['size' => 9]);
            }
            $t->addRow();
            $t->addCell($wEvid)->addText('Total', $b, ['alignment' => 'right', 'spaceAfter' => 0]);
            $t->addCell(900)->addText($esc($comp['matriz'] ? rtrim(rtrim(number_format($comp['total_pct'], 2, '.', ''), '0'), '.') : ''), $b, $centro);
            foreach ($comp['indicadores'] ?: array_fill(0, count($letras), ['valor' => '']) as $ind) {
                $t->addCell($wLetra)->addText($esc($ind['valor'] ?? ''), ['size' => 9], $centro);
            }
            $t->addCell($wFormativa);

            $section->addText(
                $esc('Nota: este apartado número 4 de la instrumentación didáctica para la formación y desarrollo de competencias profesionales se repite, de acuerdo al número de competencias específicas de los temas de asignatura.'),
                ['size' => 8, 'italic' => true], ['spaceBefore' => 60]
            );
        }

        // 5. Fuentes de información y apoyos didácticos
        $section->addPageBreak();
        $section->addText($esc('5. Fuentes de información y apoyos didácticos'), ['bold' => true, 'size' => 11], ['spaceAfter' => 60]);
        $t = $section->addTable($borde);
        $t->addRow();
        $t->addCell($ANCHO / 2, $encab)->addText($esc('Fuentes de información: (5.1)'), [], $parr);
        $t->addCell($ANCHO / 2, $encab)->addText($esc('Apoyos didácticos: (5.2)'), [], $parr);
        $t->addRow();
        $c = $t->addCell($ANCHO / 2);
        foreach ($d['fuentes'] ?: [''] as $k => $f) $c->addText($esc($f === '' ? '' : ($k + 1) . '. ' . $f), ['size' => 9], $parr);
        $c = $t->addCell($ANCHO / 2);
        foreach ($d['apoyos'] ?: [''] as $a) $c->addText($esc($a === '' ? '' : '• ' . $a), ['size' => 9], $parr);
        $section->addTextBreak(1, ['size' => 6]);

        // 6. Calendarización de evaluación en semanas
        $section->addText($esc('6. Calendarización de evaluación en semanas: (6)'), ['bold' => true, 'size' => 11], ['spaceAfter' => 60]);
        $semanas = count($d['tp']);
        $wEtq = 900;
        $wSem = intdiv($ANCHO - $wEtq, $semanas);
        $t = $section->addTable($borde);
        $t->addRow();
        $t->addCell($wEtq, $encab)->addText('Semana', ['bold' => true, 'size' => 8], $centro);
        foreach (array_keys($d['tp']) as $s) {
            $etq = $s === $semanas ? $s . "\nSegunda oportunidad" : (string) $s;
            $lineas($t->addCell($wSem, $encab), $etq, ['bold' => true, 'size' => 7], $centro);
        }
        foreach (['TP' => $d['tp'], 'TR' => [], 'SD' => []] as $fila => $valores) {
            $t->addRow(400);
            $t->addCell($wEtq, $encab)->addText($fila, ['bold' => true, 'size' => 8], $centro);
            foreach (array_keys($d['tp']) as $s) {
                $t->addCell($wSem)->addText($esc($valores[$s] ?? ''), ['size' => 8], $centro);
            }
        }
        $section->addTextBreak(1, ['size' => 4]);
        $t = $section->addTable(['borderSize' => 0, 'cellMargin' => 30]);
        foreach ([
            ['TP= tiempo planeado', 'TR = tiempo real', 'SD = seguimiento departamental'],
            ['ED = Evaluación Diagnóstica', 'EFn = Evaluación Formativa (competencia especifica n)', 'ES = Evaluación Sumativa'],
        ] as $r) {
            $t->addRow();
            foreach ($r as $txt) $t->addCell(intdiv($ANCHO, 3))->addText($esc($txt), ['size' => 8], $parr);
        }
        $section->addTextBreak(1, ['size' => 6]);

        $t = $section->addTable($borde);
        $t->addRow();
        $t->addCell(3000)->addText($esc('Fecha de elaboración:'), $b, $parr);
        $t->addCell(4000)->addText($esc($d['fecha']), [], $parr);
        $section->addTextBreak(2);

        // Firmas
        $t = $section->addTable(['cellMargin' => 40]);
        $wFirma = intdiv($ANCHO - 2000, 2);
        $t->addRow(700);
        $t->addCell($wFirma, ['valign' => 'bottom'])->addText($esc($d['docente']), $b, $centro);
        $t->addCell(2000);
        $t->addCell($wFirma, ['valign' => 'bottom'])->addText($esc($d['jefe']), $b, $centro);
        $t->addRow();
        $t->addCell($wFirma, ['borderTopSize' => 6, 'borderTopColor' => '000000'])->addText($esc('Nombre y firma del(de la) profesor(a)'), [], $centro);
        $t->addCell(2000);
        $t->addCell($wFirma, ['borderTopSize' => 6, 'borderTopColor' => '000000'])->addText($esc('Nombre y firma del(de la) Jefe(a) de Departamento Académico'), [], $centro);

        $nombreArchivo = 'instrumentacion_didactica_' . ($d['asignatura'] ?: 'planeacion') . '.docx';
        // Carpeta temporal propia: bajo `php artisan serve` en Windows no llegan TEMP/TMP y
        // sys_get_temp_dir() apunta a una carpeta sin permisos de escritura.
        $tmpDir = storage_path('app/tmp');
        if (! is_dir($tmpDir)) {
            mkdir($tmpDir, 0775, true);
        }
        \PhpOffice\PhpWord\Settings::setTempDir($tmpDir);
        $tmpPath = tempnam($tmpDir, 'docx');
        $phpWord->save($tmpPath, 'Word2007');

        return response()->download($tmpPath, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    /** Valoración numérica de cada nivel de desempeño, según los lineamientos del TecNM. */
    private const RANGO_VALORACION = [
        'Excelente'    => '95-100',
        'Notable'      => '85-94',
        'Bueno'        => '75-84',
        'Suficiente'   => '70-74',
        'Insuficiente' => 'NA (no alcanzada)',
    ];

    /**
     * Datos de la instrumentación didáctica ya ordenados según el formato oficial
     * (Instrumentación Didáctica — Ingreso Agosto 2015, SGI G4). Lo usan tanto el PDF
     * como el DOCX para que ambos salgan con el mismo contenido y estructura.
     */
    private function datosInstrumentacion(Request $request, PlaneacionDocente $planeacion): array
    {
        $planeacion->loadMissing(['docente', 'periodo', 'cargaAcademica.materia', 'cargaAcademica.grupos.carrera', 'revisadoPor']);
        $competencias = $planeacion->competencias ?? [];
        $materia = $planeacion->cargaAcademica?->materia;

        $lista = fn ($v) => array_values(array_filter(is_array($v) ? $v : (empty($v) ? [] : [$v]), fn ($x) => $x !== null && $x !== ''));

        $comps = [];
        foreach ($competencias as $i => $comp) {
            $subtemasPorFila = collect($comp['subtemas'] ?? [])->groupBy('fila');
            $filas = [];
            foreach (($comp['actividades'] ?? []) as $act) {
                $filas[] = [
                    'subtemas'   => ($subtemasPorFila->get($act['numero'] ?? null) ?? collect())->pluck('texto')->filter()->values()->all(),
                    'aprendizaje' => $act['actividad_aprendizaje'] ?? null,
                    'ensenanza'   => $act['actividad_ensenanza'] ?? null,
                    'horas'       => ($act['horas_teoricas'] ?? 0) . '-' . ($act['horas_practicas'] ?? 0),
                ];
            }

            $indicadores = collect($comp['indicadores_alcance'] ?? [])
                ->filter(fn ($ind) => !empty($ind['letra']))
                ->map(fn ($ind) => ['letra' => $ind['letra'], 'indicador' => $ind['indicador'] ?? '', 'valor' => $ind['valor'] ?? null])
                ->values()->all();
            $letras = array_column($indicadores, 'letra');

            $nivelesPorNombre = collect($comp['niveles_desempeno'] ?? [])->keyBy('nivel');
            $niveles = [];
            foreach (self::RANGO_VALORACION as $nivel => $rango) {
                $niveles[] = [
                    'nivel'       => $nivel,
                    'indicadores' => $nivelesPorNombre->get($nivel)['indicadores'] ?? '',
                    'valoracion'  => $rango,
                ];
            }

            $matriz = [];
            foreach (($comp['matriz_evaluacion'] ?? []) as $fila) {
                $marcadas = $lista($fila['indicadores'] ?? null);
                $matriz[] = [
                    'evidencia'  => $fila['evidencia'] ?? '',
                    'porcentaje' => $fila['porcentaje'] ?? null,
                    'marcas'     => array_map(fn ($l) => in_array($l, $marcadas, true), $letras),
                    'formativa'  => $fila['evaluacion_formativa'] ?? '',
                ];
            }

            $comps[] = [
                'numero'       => $comp['numero'] ?? ($i + 1),
                'nombre'       => $comp['nombre_unidad'] ?? '',
                'descripcion'  => $comp['descripcion'] ?? null,
                'filas'        => $filas,
                'genericas'    => $lista($comp['competencias_genericas'] ?? null),
                'indicadores'  => $indicadores,
                'letras'       => $letras,
                'niveles'      => $niveles,
                'matriz'       => $matriz,
                'total_pct'    => collect($matriz)->sum(fn ($f) => (float) ($f['porcentaje'] ?? 0)),
            ];
        }

        // En el formato oficial, fuentes y apoyos son una sola sección (5) para toda la
        // asignatura; el editor los captura por tema, así que se juntan sin repetir.
        $fuentes = collect($competencias)
            ->flatMap(fn ($c) => is_array($c['fuentes_informacion'] ?? null) ? $c['fuentes_informacion'] : [])
            ->map(fn ($f) => is_array($f)
                ? trim(($f['autor'] ?? '') . (!empty($f['anio']) ? ' (' . $f['anio'] . ')' : '') . (!empty($f['titulo']) ? '. ' . $f['titulo'] : ''), ' .')
                : (string) $f)
            ->filter()->unique()->values()->all();
        $apoyos = collect($competencias)
            ->flatMap(fn ($c) => $lista($c['apoyos_didacticos'] ?? null))
            ->filter()->unique()->values()->all();

        // (6) Calendarización: semanas 1–16 más la 17 de segunda oportunidad. El sistema
        // conoce el tiempo planeado (TP); TR y SD se llenan durante el semestre.
        $tp = array_fill(1, self::TOTAL_SEMANAS + 1, []);
        foreach ($this->calcularEvaluaciones($competencias, $planeacion->periodo?->fecha_inicio) as $ev) {
            if ($ev['semana_evaluacion'] !== null) {
                $tp[$ev['semana_evaluacion']][] = $ev['tipo'] === 'ES' ? 'ES' : 'EF' . $ev['unidad'];
            }
        }
        $tp = array_map(fn ($marcas) => implode(', ', $marcas), $tp);

        $fechaParam = $request->query('fecha_elaboracion') ?? $request->query('fecha_emision') ?? $request->query('fecha');
        if ($fechaParam) {
            $fecha = preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaParam) ? Carbon::parse($fechaParam)->format('d/m/Y') : $fechaParam;
        } else {
            $fecha = $planeacion->entregada_en?->format('d/m/Y') ?? now()->format('d/m/Y');
        }

        $carrera = $planeacion->cargaAcademica?->grupos?->first()?->carrera;

        return [
            'periodo'      => $planeacion->periodo?->nombre ?? '',
            'asignatura'   => $materia?->nombre ?? '',
            'plan'         => $carrera?->nombre ?? '',
            'clave'        => $materia?->clave ?? '',
            'horas'        => ($materia?->horas_teoria ?? '') . '-' . ($materia?->horas_practica ?? '') . '-' . ($materia?->creditos ?? ''),
            'caracterizacion' => $planeacion->caracterizacion,
            'intencion'    => $planeacion->intencion_didactica,
            'competencia'  => $planeacion->competencia_asignatura,
            'competencias' => $comps,
            'fuentes'      => $fuentes,
            'apoyos'       => $apoyos,
            'tp'           => $tp,
            'fecha'        => $fecha,
            'docente'      => mb_strtoupper($request->query('docente_nombre') ?? $planeacion->docente?->name ?? ''),
            'jefe'         => mb_strtoupper($this->resolverJefeFirmante($request, $planeacion) ?? ''),
            // Logos como data URI para el PDF. El del TecNM es fijo del formato del SGC.
            'logo_tec'     => $this->logoReducido('data:image/png;base64,' . base64_encode(file_get_contents(resource_path('images/logo-tecnm.png')))),
            'logo_inst'    => $this->logoReducido(\App\Domains\Institucional\Models\ConfiguracionInstitucional::instancia()->logoBase64()),
        ];
    }

    /**
     * Reduce un logo PNG/JPG (data URI) a 240 px de ancho. En el PDF de Chromium el
     * encabezado se repite en cada página con su propia copia de la imagen; con logos a
     * resolución completa una instrumentación de ~50 páginas pesaba 9 MB. SVG se deja igual.
     */
    private function logoReducido(?string $dataUri): ?string
    {
        if (! $dataUri || ! preg_match('#^data:image/(png|jpe?g);base64,(.+)$#', $dataUri, $m)) {
            return $dataUri;
        }
        $img = @imagecreatefromstring(base64_decode($m[2]));
        if (! $img || imagesx($img) <= 240) {
            return $dataUri;
        }
        $ancho = 240;
        $alto = (int) round(imagesy($img) * $ancho / imagesx($img));
        $chica = imagecreatetruecolor($ancho, $alto);
        imagealphablending($chica, false);
        imagesavealpha($chica, true);
        imagecopyresampled($chica, $img, 0, 0, 0, 0, $ancho, $alto, imagesx($img), imagesy($img));
        ob_start();
        imagepng($chica, null, 9);
        return 'data:image/png;base64,' . base64_encode(ob_get_clean());
    }

    /** Nombre del jefe(a) que firma la instrumentación, del más específico al más general. */
    private function resolverJefeFirmante(Request $request, PlaneacionDocente $planeacion): ?string
    {
        if ($nombre = $request->query('jefe_nombre')) return $nombre;

        $directorio = \App\Domains\Institucional\Models\DirectorioPersonal::where('cargo', 'like', '%Desarrollo Académico%')
            ->orWhere('cargo', 'like', '%Desarrollo%')
            ->first();
        if ($directorio) return $directorio->nombre;

        $da = User::whereHas('roles', fn ($q) => $q->where('name', 'desarrollo_academico'))->first();
        if ($da) return $da->name;

        $carreraId = $planeacion->cargaAcademica?->grupos?->first()?->carrera_id;
        if ($carreraId) {
            $jefe = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['jefe_carrera', 'jefe_departamento', 'jefe_de_departamento']))
                ->where('carrera_id', $carreraId)
                ->first();
            if ($jefe) return $jefe->name;
        }

        return $planeacion->revisadoPor?->name;
    }

    /** Misma fórmula que el editor usa para derivar "Calendarización de evaluación" a partir
     * de la dosificación (una fila por unidad, la última se marca ES y el resto EF). */
    private function calcularEvaluaciones(array $competencias, ?string $fechaInicioPeriodo): array
    {
        $evaluaciones = [];
        $ultimaIdx = count($competencias) - 1;
        foreach ($competencias as $i => $competencia) {
            $finesSemana = array_values(array_filter(array_map(
                fn ($d) => $d['semana_fin'] ?? null,
                $competencia['dosificacion'] ?? []
            ), fn ($s) => $s !== null));
            $ultimaSemanaContenido = $finesSemana ? max($finesSemana) : null;
            $semanaEvaluacion = $ultimaSemanaContenido !== null ? min(self::TOTAL_SEMANAS, $ultimaSemanaContenido + 1) : null;
            $evaluaciones[] = [
                'unidad' => $competencia['numero'],
                'nombre_unidad' => $competencia['nombre_unidad'] ?? '',
                'ultima_semana_contenido' => $ultimaSemanaContenido,
                'semana_evaluacion' => $semanaEvaluacion,
                'fechas' => $semanaEvaluacion !== null ? $this->rangoFechasSemana($fechaInicioPeriodo, $semanaEvaluacion) : null,
                'tipo' => $i === $ultimaIdx ? 'ES' : 'EF',
            ];
        }
        return $evaluaciones;
    }

    private function rangoFechasSemana(?string $fechaInicioPeriodo, int $semana): ?string
    {
        if (! $fechaInicioPeriodo) return null;
        $inicio = Carbon::parse($fechaInicioPeriodo)->startOfDay()->addDays(($semana - 1) * 7);
        $fin = (clone $inicio)->addDays(4);
        return $inicio->format('d M') . ' - ' . $fin->format('d M');
    }
}
