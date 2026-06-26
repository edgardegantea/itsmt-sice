<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Materia;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class MateriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $carreraParam = $request->query('carrera_id');
        $carreraValida = $carreraParam && preg_match('/^[0-9a-f-]{36}$/i', $carreraParam) ? $carreraParam : null;

        $materias = Materia::with('carrera')
            ->when($carreraForzada,                        fn($q, $v) => $q->where('carrera_id', $v))
            ->when(! $carreraForzada && $carreraValida,    fn($q)     => $q->where('carrera_id', $carreraValida))
            ->when($request->query('semestre'),   fn($q, $s) => $q->where('semestre', $s))
            ->when($request->query('q'),          fn($q, $s) => $q->where(fn($q) =>
                $q->where('nombre', 'ilike', "%$s%")->orWhere('clave', 'ilike', "%$s%")
            ))
            ->orderBy('semestre')->orderBy('nombre')
            ->get();

        return ApiResponse::success($materias);
    }

    public function show(Materia $materia): JsonResponse
    {
        return ApiResponse::success($materia->load('carrera'));
    }

    private function verificarCarrera(Request $request, string $carreraId): void
    {
        $restringida = $request->user()?->carreraRestringida();
        if ($restringida && $restringida !== $carreraId) {
            abort(403, 'No tienes permiso para gestionar materias de otra carrera.');
        }
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'carrera_id'           => ['required', 'uuid', 'exists:carreras,id'],
            'clave'                => ['required', 'string', 'max:20', 'unique:materias,clave'],
            'clave_oficial_tecnm'  => ['nullable', 'string', 'max:50'],
            'nombre'               => ['required', 'string', 'max:200'],
            'semestre'             => ['required', 'integer', 'min:1', 'max:10'],
            'creditos'             => ['required', 'integer', 'min:0'],
            'horas_teoria'         => ['required', 'integer', 'min:0'],
            'horas_practica'       => ['required', 'integer', 'min:0'],
            'tipo'                 => ['required', Rule::in(['obligatoria', 'optativa'])],
            // Programa TecNM
            'satca'                   => ['nullable', 'string', 'max:50'],
            'caracterizacion'         => ['nullable', 'string'],
            'intencion_didactica'     => ['nullable', 'string'],
            'competencia_especifica'  => ['nullable', 'string'],
            'competencias_previas'    => ['nullable', 'string'],
            'temario'                       => ['nullable', 'array'],
            'temario.*.tema'                => ['required_with:temario', 'string'],
            'temario.*.subtemas'            => ['nullable', 'array'],
            'actividades_aprendizaje'       => ['nullable', 'array'],
            'practicas'                     => ['nullable', 'array'],
            'practicas.*.tema'              => ['required_with:practicas', 'string'],
            'practicas.*.lista'             => ['nullable', 'array'],
            'proyecto_asignatura'           => ['nullable', 'string'],
            'evaluacion'                    => ['nullable', 'string'],
            'fuentes_informacion'           => ['nullable', 'array'],
        ]);

        $this->verificarCarrera($request, $data['carrera_id']);

        $materia = Materia::create($data);

        return ApiResponse::success($materia->load('carrera'), 'Materia creada.', 201);
    }

    public function update(Request $request, Materia $materia): JsonResponse
    {
        $this->verificarCarrera($request, $materia->carrera_id);

        $data = $request->validate([
            'carrera_id'          => ['sometimes', 'uuid', 'exists:carreras,id'],
            'clave'               => ['sometimes', 'string', 'max:20', Rule::unique('materias', 'clave')->ignore($materia->id)],
            'clave_oficial_tecnm' => ['sometimes', 'nullable', 'string', 'max:50'],
            'nombre'              => ['sometimes', 'string', 'max:200'],
            'semestre'            => ['sometimes', 'integer', 'min:1', 'max:10'],
            'creditos'            => ['sometimes', 'integer', 'min:0'],
            'horas_teoria'        => ['sometimes', 'integer', 'min:0'],
            'horas_practica'      => ['sometimes', 'integer', 'min:0'],
            'tipo'                => ['sometimes', Rule::in(['obligatoria', 'optativa'])],
            'activa'              => ['sometimes', 'boolean'],
            // Programa TecNM
            'satca'                   => ['sometimes', 'nullable', 'string', 'max:50'],
            'caracterizacion'         => ['sometimes', 'nullable', 'string'],
            'intencion_didactica'     => ['sometimes', 'nullable', 'string'],
            'competencia_especifica'  => ['sometimes', 'nullable', 'string'],
            'competencias_previas'    => ['sometimes', 'nullable', 'string'],
            'temario'                       => ['sometimes', 'nullable', 'array'],
            'temario.*.tema'                => ['required_with:temario', 'string'],
            'temario.*.subtemas'            => ['nullable', 'array'],
            'actividades_aprendizaje'       => ['sometimes', 'nullable', 'array'],
            'practicas'                     => ['sometimes', 'nullable', 'array'],
            'practicas.*.tema'              => ['required_with:practicas', 'string'],
            'practicas.*.lista'             => ['nullable', 'array'],
            'proyecto_asignatura'           => ['sometimes', 'nullable', 'string'],
            'evaluacion'                    => ['sometimes', 'nullable', 'string'],
            'fuentes_informacion'           => ['sometimes', 'nullable', 'array'],
        ]);

        $materia->update($data);

        return ApiResponse::success($materia->fresh('carrera'), 'Materia actualizada.');
    }

    /** POST /materias/{materia}/documento */
    public function subirDocumento(Request $request, Materia $materia): JsonResponse
    {
        $this->verificarCarrera($request, $materia->carrera_id);

        $request->validate([
            'documento' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:20480'],
        ]);

        // Eliminar documento anterior
        if ($materia->documento_path) {
            Storage::disk('public')->delete($materia->documento_path);
        }

        $path = $request->file('documento')->store(
            'materias/documentos',
            'public'
        );

        $materia->update(['documento_path' => $path]);

        return ApiResponse::success([
            'documento_path' => $path,
            'documento_url'  => $materia->fresh()->documento_url,
        ], 'Documento subido.');
    }

    /** DELETE /materias/{materia}/documento */
    public function eliminarDocumento(Request $request, Materia $materia): JsonResponse
    {
        $this->verificarCarrera($request, $materia->carrera_id);

        if ($materia->documento_path) {
            Storage::disk('public')->delete($materia->documento_path);
            $materia->update(['documento_path' => null]);
        }

        return ApiResponse::success(null, 'Documento eliminado.');
    }

    public function destroy(Request $request, Materia $materia): JsonResponse
    {
        $this->verificarCarrera($request, $materia->carrera_id);

        if ($materia->cargas()->exists()) {
            return ApiResponse::error('No se puede eliminar: la materia tiene cargas académicas asignadas.', 422);
        }

        if ($materia->documento_path) {
            Storage::disk('public')->delete($materia->documento_path);
        }

        $materia->delete();

        return ApiResponse::success(null, 'Materia eliminada.');
    }
}
