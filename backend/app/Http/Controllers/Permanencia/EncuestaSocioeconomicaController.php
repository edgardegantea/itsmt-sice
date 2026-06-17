<?php

namespace App\Http\Controllers\Permanencia;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Periodo;
use App\Domains\Permanencia\Models\EncuestaSocioeconomica;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EncuestaSocioeconomicaController extends Controller
{
    // GET /api/encuestas-socioeconomicas/mi-encuesta?periodo_id=
    public function miEncuesta(Request $request): JsonResponse
    {
        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        $periodo = $request->query('periodo_id')
            ? Periodo::findOrFail($request->query('periodo_id'))
            : Periodo::where('activo', true)->firstOrFail();

        $encuesta = EncuestaSocioeconomica::where('alumno_id', $alumno->id)
            ->where('periodo_id', $periodo->id)
            ->first();

        return ApiResponse::success([
            'encuesta' => $encuesta,
            'periodo'  => $periodo,
            'alumno'   => $alumno->load('inscripcion.carrera', 'inscripcion.aspirante'),
        ]);
    }

    // POST /api/encuestas-socioeconomicas  (crear o actualizar borrador)
    public function guardar(Request $request): JsonResponse
    {
        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        foreach (['vehiculos', 'gastos_mensuales'] as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $request->merge([$field => json_decode($request->input($field), true) ?? []]);
            }
        }

        $data = $request->validate($this->rules());

        $periodo = Periodo::findOrFail($data['periodo_id']);

        $encuesta = EncuestaSocioeconomica::updateOrCreate(
            ['alumno_id' => $alumno->id, 'periodo_id' => $periodo->id],
            array_merge($data, ['alumno_id' => $alumno->id])
        );

        if ($request->hasFile('foto_infantil')) {
            $path = $request->file('foto_infantil')->store(
                "fotos_encuesta/{$alumno->id}", 'public'
            );
            $encuesta->update(['foto_infantil_path' => $path]);
        }

        return ApiResponse::success($encuesta->fresh(), 'Encuesta guardada.', 200);
    }

    // POST /api/encuestas-socioeconomicas/{encuesta}/enviar
    public function enviar(Request $request, EncuestaSocioeconomica $encuesta): JsonResponse
    {
        $alumno = Alumno::where('user_id', $request->user()->id)->firstOrFail();

        if ($encuesta->alumno_id !== $alumno->id) {
            abort(403);
        }

        if ($encuesta->enviada_at) {
            return ApiResponse::error('Esta encuesta ya fue enviada.', 422);
        }

        $encuesta->update(['enviada_at' => now()]);

        return ApiResponse::success($encuesta, 'Encuesta enviada correctamente.');
    }

    // GET /api/admin/encuestas-socioeconomicas?periodo_id=
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()->carreraRestringida();

        $query = EncuestaSocioeconomica::with(['alumno.inscripcion.carrera', 'periodo'])
            ->when($carreraForzada, fn($q, $v) =>
                $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v))
            )
            ->when($request->query('periodo_id'), fn($q, $p) => $q->where('periodo_id', $p))
            ->when($request->query('alumno_id'),  fn($q, $a) => $q->where('alumno_id', $a))
            ->when($request->query('enviada'), function ($q, $v) {
                $v === 'true' ? $q->whereNotNull('enviada_at') : $q->whereNull('enviada_at');
            })
            ->orderByDesc('updated_at');

        return ApiResponse::success($query->paginate(50));
    }

    // GET /api/admin/encuestas-socioeconomicas/{encuesta}
    public function show(EncuestaSocioeconomica $encuesta): JsonResponse
    {
        return ApiResponse::success(
            $encuesta->load(['alumno.inscripcion.carrera', 'periodo'])
        );
    }

    private function rules(): array
    {
        return [
            'periodo_id'                 => ['required', 'uuid', 'exists:periodos,id'],
            'semestre'                   => ['nullable', 'integer', 'min:1', 'max:12'],
            // Fase 1 — Datos personales
            'foto_infantil'              => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:4096'],
            'dp_curp'                    => ['nullable', 'string', 'max:18'],
            'dp_fecha_nacimiento'        => ['nullable', 'date'],
            'dp_lugar_nacimiento'        => ['nullable', 'string', 'max:120'],
            'dp_sexo'                    => ['nullable', 'string', 'max:20'],
            'dp_estado_civil'            => ['nullable', 'string', 'max:30'],
            'dp_telefono'                => ['nullable', 'string', 'max:20'],
            'dp_email'                   => ['nullable', 'email', 'max:150'],
            'dp_municipio_procedencia'   => ['nullable', 'string', 'max:120'],
            'dp_escuela_bachillerato'    => ['nullable', 'string', 'max:220'],
            // I
            'con_quien_vive'             => ['nullable', 'string', 'max:100'],
            'tiene_beca'                 => ['nullable', 'boolean'],
            'beca'                       => ['nullable', 'string', 'max:150'],
            'ingreso_propio'             => ['nullable', 'string', 'max:200'],
            // III Padre
            'padre_nivel_educativo'      => ['nullable', 'string', 'max:50'],
            'padre_situacion_laboral'    => ['nullable', 'string', 'max:30'],
            'padre_ocupacion'            => ['nullable', 'string', 'max:150'],
            'padre_centro_trabajo'       => ['nullable', 'string', 'max:150'],
            'padre_cargo'                => ['nullable', 'string', 'max:100'],
            'padre_tiempo_servicio'      => ['nullable', 'string', 'max:60'],
            'padre_ingresos_mensuales'   => ['nullable', 'numeric', 'min:0'],
            'padre_otros_ingresos'       => ['nullable', 'string', 'max:200'],
            // IV Madre
            'madre_nivel_educativo'      => ['nullable', 'string', 'max:50'],
            'madre_situacion_laboral'    => ['nullable', 'string', 'max:30'],
            'madre_ocupacion'            => ['nullable', 'string', 'max:150'],
            'madre_centro_trabajo'       => ['nullable', 'string', 'max:150'],
            'madre_cargo'                => ['nullable', 'string', 'max:100'],
            'madre_tiempo_servicio'      => ['nullable', 'string', 'max:60'],
            'madre_ingresos_mensuales'   => ['nullable', 'numeric', 'min:0'],
            'madre_otros_ingresos'       => ['nullable', 'string', 'max:200'],
            // V Familia
            'familia_total_integrantes'  => ['nullable', 'integer', 'min:0'],
            'familia_num_hijos'          => ['nullable', 'integer', 'min:0'],
            'familia_edades_hijos'       => ['nullable', 'string', 'max:100'],
            'familia_num_estudiantes'    => ['nullable', 'integer', 'min:0'],
            // VI Vivienda
            'vivienda_calle'             => ['nullable', 'string', 'max:150'],
            'vivienda_numero'            => ['nullable', 'string', 'max:20'],
            'vivienda_colonia'           => ['nullable', 'string', 'max:100'],
            'vivienda_municipio'         => ['nullable', 'string', 'max:100'],
            'vivienda_tipo'              => ['nullable', 'string', 'max:50'],
            'vivienda_tipo_propiedad'    => ['nullable', 'string', 'max:50'],
            'vivienda_otras_propiedades' => ['nullable', 'string'],
            'tiene_vehiculo'             => ['nullable', 'boolean'],
            'vehiculos'                  => ['nullable', 'array'],
            'vehiculos.*.tipo'           => ['nullable', 'string'],
            'vehiculos.*.marca'          => ['nullable', 'string'],
            'vehiculos.*.anio'           => ['nullable', 'integer'],
            'traslado_escuela'           => ['nullable', 'string', 'max:50'],
            'total_ingresos_familia'     => ['nullable', 'numeric', 'min:0'],
            'otros_ingresos_familia'     => ['nullable', 'numeric', 'min:0'],
            'gastos_mensuales'           => ['nullable', 'array'],
            'total_egresos_familia'      => ['nullable', 'numeric', 'min:0'],
            // VII Salud
            'salud_estado'               => ['nullable', 'string', 'max:20'],
            'salud_problema_familiar'    => ['nullable', 'boolean'],
            'salud_especifique'          => ['nullable', 'string', 'max:300'],
            // VIII
            'informacion_adicional'      => ['nullable', 'string'],
        ];
    }
}
