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
            'url_logo_principal'     => $config->urlLogoPrincipal(),
            'url_logo_secundario'    => $config->urlLogoSecundario(),
            'url_login_imagen_fondo' => $config->urlLoginImagenFondo(),
            'logo_base64'            => $config->logoBase64(),
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
            'fecha_inicio_actualizacion_datos' => ['sometimes', 'nullable', 'date'],
            'fecha_fin_actualizacion_datos'    => ['sometimes', 'nullable', 'date', 'after_or_equal:fecha_inicio_actualizacion_datos'],
            'login_titulo'                     => ['sometimes', 'nullable', 'string', 'max:150'],
            'login_subtitulo'                  => ['sometimes', 'nullable', 'string', 'max:250'],
            'login_opacidad_fondo'             => ['sometimes', 'numeric', 'min:0', 'max:1'],
        ]);

        $config = ConfiguracionInstitucional::instancia();
        $config->update($datos);

        return ApiResponse::success(array_merge($config->fresh()->toArray(), [
            'url_logo_principal'     => $config->urlLogoPrincipal(),
            'url_logo_secundario'    => $config->urlLogoSecundario(),
            'url_login_imagen_fondo' => $config->urlLoginImagenFondo(),
        ]), 'Configuración actualizada.');
    }

    // POST /api/admin/configuracion/logo
    public function subirLogo(Request $request): JsonResponse
    {
        $this->authorize('update', ConfiguracionInstitucional::class);

        $request->validate([
            'logo' => ['required', 'file', 'mimes:svg,png,jpg,jpeg,webp', 'max:4096'],
            'tipo' => ['required', 'in:principal,secundario,fondo'],
        ]);

        $config = ConfiguracionInstitucional::instancia();
        $campo  = match ($request->tipo) {
            'secundario' => 'logo_secundario',
            'fondo'      => 'login_imagen_fondo',
            default      => 'logo_principal',
        };

        if ($config->$campo) {
            Storage::disk('public')->delete($config->$campo);
        }

        $carpeta = $request->tipo === 'fondo' ? 'config/fondos' : 'config/logos';
        $path = $request->file('logo')->store($carpeta, 'public');
        $config->update([$campo => $path]);

        return ApiResponse::success([
            'path' => $path,
            'url'  => Storage::disk('public')->url($path),
        ], 'Logo actualizado.');
    }

    // PATCH /api/admin/configuracion/maestria  (solo superadmin)
    public function toggleMaestria(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('superadmin'), 403, 'Solo el superadmin puede habilitar o deshabilitar la opción de maestría.');

        $datos = $request->validate([
            'maestria_habilitada' => ['required', 'boolean'],
        ]);

        $config = ConfiguracionInstitucional::instancia();
        $config->update(['maestria_habilitada' => $datos['maestria_habilitada']]);

        $estado = $datos['maestria_habilitada'] ? 'habilitada' : 'deshabilitada';

        return ApiResponse::success(
            ['maestria_habilitada' => $config->fresh()->maestria_habilitada],
            "Opción de maestría {$estado}."
        );
    }

    // DELETE /api/admin/configuracion/logo
    public function eliminarLogo(Request $request): JsonResponse
    {
        $this->authorize('update', ConfiguracionInstitucional::class);

        $request->validate(['tipo' => ['required', 'in:principal,secundario,fondo']]);

        $config = ConfiguracionInstitucional::instancia();
        $campo  = match ($request->tipo) {
            'secundario' => 'logo_secundario',
            'fondo'      => 'login_imagen_fondo',
            default      => 'logo_principal',
        };

        if ($config->$campo) {
            Storage::disk('public')->delete($config->$campo);
            $config->update([$campo => null]);
        }

        return ApiResponse::success(null, 'Logo eliminado.');
    }
}
