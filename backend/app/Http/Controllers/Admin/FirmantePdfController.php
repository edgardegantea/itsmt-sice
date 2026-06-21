<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Institucional\Models\FirmantePdf;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FirmantePdfController extends Controller
{
    public function index(): JsonResponse
    {
        $firmantes = FirmantePdf::orderBy('orden')->orderBy('id')->get();
        return response()->json(['data' => $firmantes]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('update', \App\Domains\Institucional\Models\ConfiguracionInstitucional::class);

        $data = $request->validate([
            'clave'  => ['required', 'string', 'max:80', 'unique:firmantes_pdf,clave', 'regex:/^[a-z0-9_]+$/'],
            'nombre' => ['required', 'string', 'max:150'],
            'cargo'  => ['required', 'string', 'max:150'],
            'orden'  => ['nullable', 'integer', 'min:0'],
            'activo' => ['nullable', 'boolean'],
        ]);

        $firmante = FirmantePdf::create($data);
        return response()->json(['data' => $firmante], 201);
    }

    public function update(Request $request, FirmantePdf $firmantePdf): JsonResponse
    {
        $this->authorize('update', \App\Domains\Institucional\Models\ConfiguracionInstitucional::class);

        $data = $request->validate([
            'clave'  => ['sometimes', 'string', 'max:80', 'regex:/^[a-z0-9_]+$/', "unique:firmantes_pdf,clave,{$firmantePdf->id}"],
            'nombre' => ['sometimes', 'string', 'max:150'],
            'cargo'  => ['sometimes', 'string', 'max:150'],
            'orden'  => ['nullable', 'integer', 'min:0'],
            'activo' => ['nullable', 'boolean'],
        ]);

        $firmantePdf->update($data);
        return response()->json(['data' => $firmantePdf->fresh()]);
    }

    public function destroy(FirmantePdf $firmantePdf): JsonResponse
    {
        $this->authorize('update', \App\Domains\Institucional\Models\ConfiguracionInstitucional::class);

        $firmantePdf->delete();
        return response()->json(null, 204);
    }
}
