<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Institucional\Models\ConfiguracionInstitucional;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ConfiguracionController extends Controller
{
    // GET /api/configuracion  (público)
    public function show(): JsonResponse
    {
        $config = ConfiguracionInstitucional::instancia();

        return ApiResponse::success(array_merge($config->toArray(), [
            'url_logo_principal'  => $config->urlLogoPrincipal(),
            'url_logo_secundario' => $config->urlLogoSecundario(),
            'logo_base64'         => $config->logoBase64(),
        ]));
    }

    // PATCH /api/admin/configuracion
    public function update(Request $request): JsonResponse
    {
        $this->authorize('update', ConfiguracionInstitucional::class);

        $datos = $request->validate([
            'nombre_institucion'  => ['sometimes', 'string', 'max:200'],
            'nombre_corto'        => ['sometimes', 'string', 'max:30'],
            'clave_tecnm'         => ['sometimes', 'nullable', 'string', 'max:20'],
            'dependencia'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'subsistema'          => ['sometimes', 'nullable', 'string', 'max:150'],
            'direccion'           => ['sometimes', 'nullable', 'string', 'max:200'],
            'ciudad'              => ['sometimes', 'nullable', 'string', 'max:100'],
            'estado'              => ['sometimes', 'nullable', 'string', 'max:100'],
            'cp'                  => ['sometimes', 'nullable', 'string', 'max:10'],
            'telefono'            => ['sometimes', 'nullable', 'string', 'max:20'],
            'email_institucional' => ['sometimes', 'nullable', 'email'],
            'sitio_web'           => ['sometimes', 'nullable', 'url'],
            'color_primario'                   => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_secundario'                 => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'subdirector_academico'            => ['sometimes', 'nullable', 'string', 'max:150'],
            'responsable_servicios_escolares'  => ['sometimes', 'nullable', 'string', 'max:150'],
            'fuente_interfaz'                  => ['sometimes', 'string', 'max:60'],
        ]);

        $config = ConfiguracionInstitucional::instancia();
        $config->update($datos);

        return ApiResponse::success(array_merge($config->fresh()->toArray(), [
            'url_logo_principal'  => $config->urlLogoPrincipal(),
            'url_logo_secundario' => $config->urlLogoSecundario(),
        ]), 'Configuración actualizada.');
    }

    // POST /api/admin/configuracion/logo
    public function subirLogo(Request $request): JsonResponse
    {
        $this->authorize('update', ConfiguracionInstitucional::class);

        $request->validate([
            'logo' => ['required', 'file', 'mimes:svg,png,jpg,jpeg,webp', 'max:2048'],
            'tipo' => ['required', 'in:principal,secundario'],
        ]);

        $config = ConfiguracionInstitucional::instancia();
        $campo  = $request->tipo === 'secundario' ? 'logo_secundario' : 'logo_principal';

        if ($config->$campo) {
            Storage::disk('public')->delete($config->$campo);
        }

        $path = $request->file('logo')->store('config/logos', 'public');
        $config->update([$campo => $path]);

        return ApiResponse::success([
            'path' => $path,
            'url'  => Storage::disk('public')->url($path),
        ], 'Logo actualizado.');
    }

    // DELETE /api/admin/configuracion/logo
    public function eliminarLogo(Request $request): JsonResponse
    {
        $this->authorize('update', ConfiguracionInstitucional::class);

        $request->validate(['tipo' => ['required', 'in:principal,secundario']]);

        $config = ConfiguracionInstitucional::instancia();
        $campo  = $request->tipo === 'secundario' ? 'logo_secundario' : 'logo_principal';

        if ($config->$campo) {
            Storage::disk('public')->delete($config->$campo);
            $config->update([$campo => null]);
        }

        return ApiResponse::success(null, 'Logo eliminado.');
    }
}
