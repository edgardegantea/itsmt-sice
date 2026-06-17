<?php

namespace App\Http\Controllers\Academico;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Tutoria;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TutoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $carreraForzada = $request->user()?->carreraRestringida();

        $tutorias = Tutoria::with(['tutor', 'alumno.user', 'alumno.carrera', 'periodo'])
            ->when($carreraForzada, fn($q, $v) => $q->whereHas('alumno', fn($aq) => $aq->where('carrera_id', $v)))
            ->when($request->query('tutor_id'),    fn($q, $t) => $q->where('tutor_id', $t))
            ->when($request->query('periodo_id'),  fn($q, $p) => $q->where('periodo_id', $p))
            ->when($request->query('alumno_id'),   fn($q, $a) => $q->where('alumno_id', $a))
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiResponse::success($tutorias);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tutor_id'   => ['required', 'uuid', 'exists:users,id'],
            'alumno_id'  => ['required', 'uuid', 'exists:alumnos,id'],
            'periodo_id' => ['required', 'uuid', 'exists:periodos,id'],
        ]);

        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $alumno = Alumno::findOrFail($data['alumno_id']);
            if ($alumno->carrera_id !== $carreraForzada) {
                return ApiResponse::error('El alumno no pertenece a tu carrera.', 403);
            }
        }

        $tutoria = Tutoria::create($data);

        return ApiResponse::success(
            $tutoria->load(['tutor', 'alumno.user', 'periodo']),
            'Tutoría asignada.',
            201
        );
    }

    // POST /api/admin/tutorias/masivo  — asignar un tutor a varios alumnos de golpe
    public function masivo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tutor_id'    => ['required', 'uuid', 'exists:users,id'],
            'periodo_id'  => ['required', 'uuid', 'exists:periodos,id'],
            'alumno_ids'  => ['required', 'array', 'min:1'],
            'alumno_ids.*'=> ['uuid', 'exists:alumnos,id'],
        ]);

        // Jefe de carrera solo puede asignar tutorías a alumnos de su carrera
        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada) {
            $foraneos = Alumno::whereIn('id', $data['alumno_ids'])
                ->where('carrera_id', '!=', $carreraForzada)
                ->count();
            if ($foraneos > 0) {
                return ApiResponse::error('Algunos alumnos no pertenecen a tu carrera.', 403);
            }
        }

        $created = 0;
        foreach ($data['alumno_ids'] as $alumnoId) {
            Tutoria::firstOrCreate(
                ['tutor_id' => $data['tutor_id'], 'alumno_id' => $alumnoId, 'periodo_id' => $data['periodo_id']]
            );
            $created++;
        }

        return ApiResponse::success(['asignadas' => $created], "$created tutoría(s) asignada(s).", 201);
    }

    public function destroy(Request $request, Tutoria $tutoria): JsonResponse
    {
        $carreraForzada = $request->user()->carreraRestringida();
        if ($carreraForzada && $tutoria->alumno?->carrera_id !== $carreraForzada) {
            abort(403, 'No puedes eliminar tutorías de alumnos de otra carrera.');
        }

        $tutoria->delete();

        return ApiResponse::success(null, 'Tutoría eliminada.');
    }
}
