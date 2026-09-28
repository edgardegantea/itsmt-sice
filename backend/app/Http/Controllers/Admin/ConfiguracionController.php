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
            'form_border_radius'               => ['sometimes', 'string', 'in:sm,md,lg,xl,full'],
            'form_density'                     => ['sometimes', 'string', 'in:compact,comfortable,spacious'],
            'form_bg_style'                    => ['sometimes', 'string', 'in:white,slate,glass,tint'],
            'form_focus_ring_color'            => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'form_border_tone'                 => ['sometimes', 'string', 'in:slate-200,slate-300,primary-tint,dark'],
            'form_label_weight'                => ['sometimes', 'string', 'in:normal,medium,semibold,bold'],
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
        $config = ConfiguracionInstitucional::instancia();
        $this->authorize('update', $config);

        $file = $request->file('logo');
        if (! $file || ! $file->isValid()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'El archivo seleccionado no es válido o superó el límite permitido por el servidor.',
            ], 422);
        }

        $validator = \Illuminate\Support\Facades\Validator::make(
            array_merge($request->all(), $request->allFiles()),
            [
                'logo' => ['required', 'file', 'max:10240'],
                'tipo' => ['required', 'in:principal,secundario,fondo'],
            ],
            [
                'logo.required' => 'Debe seleccionar un archivo de imagen.',
                'logo.file'     => 'El archivo seleccionado no es válido.',
                'logo.max'      => 'La imagen no debe pesar más de 10 MB.',
                'tipo.required' => 'El tipo de logo es obligatorio.',
                'tipo.in'       => 'El tipo de logo no es válido.',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors()->toArray(),
            ], 422);
        }

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

    // PATCH /api/admin/configuracion/recordatorios-asistencia  (solo superadmin)
    public function toggleRecordatoriosAsistencia(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('superadmin'), 403, 'Solo el superadmin puede activar o desactivar los recordatorios de asistencia.');

        $datos = $request->validate([
            'recordatorios_asistencia_global_activo' => ['required', 'boolean'],
        ]);

        $config = ConfiguracionInstitucional::instancia();
        $config->update(['recordatorios_asistencia_global_activo' => $datos['recordatorios_asistencia_global_activo']]);

        $estado = $datos['recordatorios_asistencia_global_activo'] ? 'activados' : 'desactivados';

        return ApiResponse::success(
            ['recordatorios_asistencia_global_activo' => $config->fresh()->recordatorios_asistencia_global_activo],
            "Recordatorios de asistencia {$estado} para todos los docentes."
        );
    }

    // DELETE /api/admin/configuracion/logo
    public function eliminarLogo(Request $request): JsonResponse
    {
        $config = ConfiguracionInstitucional::instancia();
        $this->authorize('update', $config);

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
