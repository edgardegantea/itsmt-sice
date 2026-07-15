<?php

namespace App\Http\Controllers\Biblioteca;

use App\Domains\Biblioteca\Models\Acervo;
use App\Domains\Biblioteca\Models\Ejemplar;
use App\Domains\Biblioteca\Models\Prestamo;
use App\Domains\Biblioteca\Models\ReservaBiblioteca;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcervoController extends Controller
{
    // GET /api/acervo
    public function index(Request $request): JsonResponse
    {
        $acervo = Acervo::query()
            ->when($request->query('q'), fn($q, $v) =>
                $q->where(fn($q) =>
                    $q->whereRaw('LOWER(titulo) LIKE ?', ['%' . strtolower($v) . '%'])
                      ->orWhereRaw('LOWER(autor) LIKE ?', ['%' . strtolower($v) . '%'])
                      ->orWhereRaw('LOWER(isbn) LIKE ?', ['%' . strtolower($v) . '%'])
                )
            )
            ->when($request->query('categoria'), fn($q, $v) => $q->where('categoria', $v))
            ->when($request->boolean('solo_disponibles'), fn($q) => $q->where('ejemplares_disponibles', '>', 0))
            ->where('activo', true)
            ->orderBy('titulo')
            ->paginate(20);

        return ApiResponse::success($acervo);
    }

    // POST /api/acervo
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'isbn'                  => ['nullable', 'string', 'max:30', 'unique:acervo,isbn'],
            'titulo'                => ['required', 'string', 'max:300'],
            'autor'                 => ['required', 'string', 'max:200'],
            'editorial'             => ['nullable', 'string', 'max:100'],
            'anio_edicion'          => ['nullable', 'integer', 'min:1800', 'max:2100'],
            'edicion'               => ['nullable', 'string', 'max:50'],
            'categoria'             => ['nullable', 'string', 'max:100'],
            'clasificacion_dewey'   => ['nullable', 'string', 'max:20'],
        ]);

        $acervo = Acervo::create($data);

        return ApiResponse::success($acervo, 'Libro registrado en el acervo.', 201);
    }

    // GET /api/acervo/{acervo}/ejemplares
    public function ejemplares(Acervo $acervo): JsonResponse
    {
        return ApiResponse::success($acervo->ejemplares()->withCount('prestamos')->get());
    }

    // POST /api/acervo/{acervo}/ejemplares
    public function agregarEjemplar(Request $request, Acervo $acervo): JsonResponse
    {
        $data = $request->validate([
            'codigo_barras'      => ['required', 'string', 'unique:ejemplares,codigo_barras'],
            'numero_adquisicion' => ['nullable', 'string', 'max:50'],
            'observaciones'      => ['nullable', 'string'],
        ]);

        $ejemplar = Ejemplar::create(array_merge($data, [
            'acervo_id' => $acervo->id,
            'estatus'   => 'disponible',
        ]));

        $acervo->increment('total_ejemplares');
        $acervo->increment('ejemplares_disponibles');

        return ApiResponse::success($ejemplar, 'Ejemplar agregado.', 201);
    }

    // GET /api/prestamos
    public function prestamos(Request $request): JsonResponse
    {
        $query = Prestamo::with(['ejemplar.acervo', 'usuario'])
            ->when($request->query('estatus'), fn($q, $v) => $q->where('estatus', $v))
            ->when($request->query('user_id'), fn($q, $v) => $q->where('user_id', $v))
            ->orderByDesc('fecha_prestamo');

        return ApiResponse::success($query->paginate(20));
    }

    // POST /api/prestamos
    public function crearPrestamo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ejemplar_id'                => ['required', 'uuid', 'exists:ejemplares,id'],
            'user_id'                    => ['required', 'uuid', 'exists:users,id'],
            'fecha_devolucion_esperada'  => ['required', 'date', 'after:today'],
        ]);

        $ejemplar = Ejemplar::findOrFail($data['ejemplar_id']);

        if ($ejemplar->estatus !== 'disponible') {
            return ApiResponse::error('El ejemplar no está disponible para préstamo.', 422);
        }

        $prestamo = Prestamo::create([
            'ejemplar_id'               => $ejemplar->id,
            'user_id'                   => $data['user_id'],
            'fecha_prestamo'            => now()->toDateString(),
            'fecha_devolucion_esperada' => $data['fecha_devolucion_esperada'],
            'estatus'                   => 'activo',
            'atendido_por'              => $request->user()->id,
        ]);

        $ejemplar->update(['estatus' => 'prestado']);
        $ejemplar->acervo?->decrement('ejemplares_disponibles');

        return ApiResponse::success($prestamo->load(['ejemplar.acervo', 'usuario']), 'Préstamo registrado.', 201);
    }

    // PATCH /api/prestamos/{prestamo}/devolver
    public function devolver(Request $request, Prestamo $prestamo): JsonResponse
    {
        if ($prestamo->estatus !== 'activo') {
            return ApiResponse::error('Este préstamo ya fue cerrado.', 422);
        }

        $hoy = now()->toDateString();
        $multaDias = max(0, now()->diffInDays($prestamo->fecha_devolucion_esperada, false) * -1);
        $multa = $multaDias * 5.00;

        $prestamo->update([
            'estatus'              => 'devuelto',
            'fecha_devolucion_real'=> $hoy,
            'multa_acumulada'      => $multa,
        ]);

        $prestamo->ejemplar?->update(['estatus' => 'disponible']);
        $prestamo->ejemplar?->acervo?->increment('ejemplares_disponibles');

        return ApiResponse::success($prestamo->fresh('ejemplar.acervo'), 'Devolución registrada.');
    }

    // PATCH /api/prestamos/{prestamo}/renovar
    public function renovar(Request $request, Prestamo $prestamo): JsonResponse
    {
        if ($prestamo->estatus !== 'activo') {
            return ApiResponse::error('Solo se pueden renovar préstamos activos.', 422);
        }

        if ($prestamo->renovaciones >= 2) {
            return ApiResponse::error('Se alcanzó el límite de renovaciones (2).', 422);
        }

        $data = $request->validate([
            'nueva_fecha_devolucion' => ['required', 'date', 'after:today'],
        ]);

        $prestamo->update([
            'fecha_devolucion_esperada' => $data['nueva_fecha_devolucion'],
            'renovaciones'              => $prestamo->renovaciones + 1,
        ]);

        return ApiResponse::success($prestamo->fresh(), 'Préstamo renovado.');
    }

    // GET /api/usuarios/{user}/prestamos
    public function prestamosPorUsuario(Request $request, \App\Models\User $user): JsonResponse
    {
        if ($request->user()->id !== $user->id && ! $request->user()->hasAnyRole(['superadmin', 'admin', 'personal_administrativo'])) {
            abort(403, 'No autorizado.');
        }

        $prestamos = Prestamo::with(['ejemplar.acervo'])
            ->where('user_id', $user->id)
            ->orderByDesc('fecha_prestamo')
            ->get();

        return ApiResponse::success($prestamos);
    }

    // GET /api/biblioteca/estadisticas
    public function estadisticas(): JsonResponse
    {
        return ApiResponse::success([
            'total_titulos'         => Acervo::where('activo', true)->count(),
            'total_ejemplares'      => Ejemplar::count(),
            'prestamos_activos'     => Prestamo::where('estatus', 'activo')->count(),
            'prestamos_vencidos'    => Prestamo::where('estatus', 'activo')
                ->where('fecha_devolucion_esperada', '<', now()->toDateString())->count(),
            'reservas_activas'      => ReservaBiblioteca::where('estatus', 'activa')->count(),
        ]);
    }
}
