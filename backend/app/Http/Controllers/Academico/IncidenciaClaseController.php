<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\CargaAcademica;
use App\Domains\Academico\Models\IncidenciaClase;
use App\Domains\Academico\Models\TicketMantenimiento;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Mail\IncidenciaClaseRegistradaMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class IncidenciaClaseController extends Controller
{
    // Quién puede registrar rondas de prefectura (crear incidencias).
    private const ROLES_REGISTRO = ['superadmin', 'admin', 'personal_administrativo', 'control_escolar',
        'director_academico', 'jefe_carrera'];

    // Quién puede consultar la bitácora completa (todas las carreras/docentes).
    private const ROLES_CONSULTA = ['superadmin', 'admin', 'personal_administrativo',
        ...User::ROLES_DIRECTIVOS, 'jefe_carrera'];

    // GET /api/incidencias-clase?periodo_id=&carrera_id=&semestre=&grupo_id=&docente_id=&estatus=&fecha_desde=&fecha_hasta=
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $esSoloDocente = $user?->hasRole('docente') && ! $user->hasAnyRole(self::ROLES_CONSULTA);

        // Un docente no puede ver la bitácora ajena: entra por esta rama y solo
        // consulta lo que se reportó sobre sus propias clases durante el semestre,
        // sin importar qué filtros mande en la query string.
        if (! $user?->hasAnyRole(self::ROLES_CONSULTA) && ! $esSoloDocente) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $query = IncidenciaClase::query()
            ->with(['grupo.carrera', 'cargaAcademica.materia', 'docente', 'aula', 'registradoPor', 'periodo'])
            ->when($request->query('periodo_id'), fn($q, $v) => $q->where('periodo_id', $v))
            ->when($request->query('grupo_id'),   fn($q, $v) => $q->where('grupo_id', $v))
            ->when($request->query('estatus'),    fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('fecha_desde'), fn($q, $v) => $q->whereDate('fecha', '>=', $v))
            ->when($request->query('fecha_hasta'), fn($q, $v) => $q->whereDate('fecha', '<=', $v));

        if ($esSoloDocente) {
            $query->where('docente_id', $user->id);
        } else {
            $query
                ->when($request->query('docente_id'), fn($q, $v) => $q->where('docente_id', $v))
                ->when($request->query('carrera_id'), fn($q, $v) => $q->whereHas('grupo', fn($g) => $g->where('carrera_id', $v)))
                ->when($request->query('semestre'),   fn($q, $v) => $q->whereHas('grupo', fn($g) => $g->where('semestre', $v)));
        }

        // jefe_carrera solo ve la bitácora de su propia carrera, aun cuando pida otra.
        if ($user->hasRole('jefe_carrera') && ! $user->hasAnyRole(['superadmin', 'admin', ...User::ROLES_DIRECTIVOS])) {
            $query->whereHas('grupo', fn($g) => $g->where('carrera_id', $user->carrera_id));
        }

        $incidencias = $query->orderByDesc('fecha')->orderByDesc('hora_revision')->limit(500)->get();

        return ApiResponse::success($incidencias);
    }

    // POST /api/incidencias-clase
    public function store(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_REGISTRO)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $data = $request->validate([
            'periodo_id'          => ['required', 'uuid', 'exists:periodos,id'],
            'grupo_id'            => ['required', 'uuid', 'exists:grupos,id'],
            'carga_academica_id'  => ['nullable', 'uuid', 'exists:cargas_academicas,id'],
            'docente_id'          => ['nullable', 'uuid', 'exists:users,id'],
            'aula_id'             => ['nullable', 'uuid', 'exists:aulas,id'],
            'fecha'               => ['required', 'date'],
            'hora_revision'       => ['required', 'date_format:H:i'],
            'dia_semana'          => ['nullable', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'estatus'             => ['required', 'in:sin_novedad,docente_ausente,aula_vacia,grupo_incorrecto,aula_incorrecta,alumnos_incompletos,problema_infraestructura,otro'],
            'docente_presente'    => ['nullable', 'boolean'],
            'coincide_horario'    => ['nullable', 'boolean'],
            'alumnos_presentes'   => ['nullable', 'integer', 'min:0', 'max:200'],
            'observaciones'       => ['nullable', 'string', 'max:2000'],
        ]);

        $data['registrado_por_id'] = $request->user()->id;

        $incidencia = IncidenciaClase::create($data)
            ->load(['grupo.carrera', 'cargaAcademica.materia', 'docente', 'aula', 'registradoPor', 'periodo']);

        // Solo avisamos al docente cuando hay algo que reportar — "sin novedad" no
        // genera correo, para no acumular ruido en su bandeja por cada ronda normal.
        if ($incidencia->estatus !== 'sin_novedad' && $incidencia->docente?->email) {
            Mail::to($incidencia->docente->email)->queue(new IncidenciaClaseRegistradaMail($incidencia));
        }

        // Un problema de infraestructura no es un problema de horario: generamos
        // el ticket de mantenimiento automáticamente para que no dependa de que
        // alguien lo capture por separado en otra pantalla.
        if ($incidencia->estatus === 'problema_infraestructura' && $incidencia->aula_id) {
            TicketMantenimiento::create([
                'incidencia_clase_id' => $incidencia->id,
                'aula_id'             => $incidencia->aula_id,
                'reportado_por_id'    => $request->user()->id,
                'descripcion'         => $incidencia->observaciones ?: 'Problema de infraestructura reportado en ronda de prefectura.',
                'estatus'             => 'abierto',
            ]);
        }

        return ApiResponse::success($incidencia, 'Ronda registrada.', 201);
    }

    // GET /api/incidencias-clase/horario-esperado?grupo_id=&periodo_id=&dia_semana=&hora=
    // Ayuda a prefectura a saber, antes de calificar la ronda, qué materia/docente/aula
    // debería estar ocurriendo ahí según el horario — para poder comparar contra lo
    // que observó físicamente.
    public function horarioEsperado(Request $request): JsonResponse
    {
        if (! $request->user()?->hasAnyRole(self::ROLES_REGISTRO)) {
            return ApiResponse::error('No autorizado.', 403);
        }

        $request->validate([
            'grupo_id'   => ['required', 'uuid'],
            'periodo_id' => ['required', 'uuid'],
            'dia_semana' => ['required', 'in:lunes,martes,miercoles,jueves,viernes,sabado'],
            'hora'       => ['required', 'date_format:H:i'],
        ]);

        $carga = CargaAcademica::with(['materia', 'docente', 'aula', 'grupos'])
            ->where('periodo_id', $request->periodo_id)
            ->whereHas('grupos', fn($q) => $q->where('grupos.id', $request->grupo_id))
            ->whereHas('horarios', function ($q) use ($request) {
                $q->where('dia_semana', $request->dia_semana)
                  ->where('hora_inicio', '<=', $request->hora)
                  ->where('hora_fin', '>', $request->hora);
            })
            ->first();

        return ApiResponse::success($carga);
    }
}
