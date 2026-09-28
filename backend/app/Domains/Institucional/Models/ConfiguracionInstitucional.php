<?php

namespace App\Domains\Institucional\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ConfiguracionInstitucional extends Model
{
    protected $table = 'configuracion_institucional';

    protected $fillable = [
        'nombre_institucion',
        'nombre_corto',
        'clave_tecnm',
        'dependencia',
        'subsistema',
        'direccion',
        'ciudad',
        'estado',
        'cp',
        'telefono',
        'email_institucional',
        'sitio_web',
        'logo_principal',
        'logo_secundario',
        'color_primario',
        'color_secundario',
        'subdirector_academico',
        'responsable_servicios_escolares',
        'fuente_interfaz',
        'fecha_inicio_actualizacion_datos',
        'fecha_fin_actualizacion_datos',
        'login_titulo',
        'login_subtitulo',
        'login_imagen_fondo',
        'login_opacidad_fondo',
        'color_acento',
        'color_sidebar',
        'radio_bordes',
        'maestria_habilitada',
        'recordatorios_asistencia_global_activo',
        'form_border_radius',
        'form_density',
        'form_bg_style',
        'form_focus_ring_color',
        'form_border_tone',
        'form_label_weight',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio_actualizacion_datos' => 'date',
            'fecha_fin_actualizacion_datos'    => 'date',
            'login_opacidad_fondo'             => 'float',
            'maestria_habilitada'              => 'boolean',
            'recordatorios_asistencia_global_activo' => 'boolean',
        ];
    }

    public static function instancia(): self
    {
        return self::firstOrCreate(['id' => 1], []);
    }

    public function urlLogoPrincipal(): ?string
    {
        if (!$this->logo_principal) return null;
        return Storage::disk('public')->url($this->logo_principal);
    }

    public function urlLogoSecundario(): ?string
    {
        if (!$this->logo_secundario) return null;
        return Storage::disk('public')->url($this->logo_secundario);
    }

    public function urlLoginImagenFondo(): ?string
    {
        if (!$this->login_imagen_fondo) return null;
        return Storage::disk('public')->url($this->login_imagen_fondo);
    }

    public function logoBase64(): ?string
    {
        return $this->imagenBase64($this->logo_principal);
    }

    /** Logo secundario (normalmente el del TecNM) como data URI, para los PDF. */
    public function logoSecundarioBase64(): ?string
    {
        return $this->imagenBase64($this->logo_secundario);
    }

    /**
     * Ruta absoluta de un logo raster (PNG/JPG) para PhpWord, que no acepta SVG ni data URI.
     * Devuelve null si el archivo no existe o es SVG.
     */
    public function rutaLogoRaster(string $tipo = 'principal'): ?string
    {
        $path = $tipo === 'secundario' ? $this->logo_secundario : $this->logo_principal;
        if (! $path || ! Storage::disk('public')->exists($path)) return null;
        if (str_contains(Storage::disk('public')->mimeType($path) ?? '', 'svg')) return null;
        return Storage::disk('public')->path($path);
    }

    private function imagenBase64(?string $path): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) return null;
        $mime = Storage::disk('public')->mimeType($path);
        $raw  = Storage::disk('public')->get($path);
        if (str_contains($mime, 'svg')) {
            // dompdf (php-svg-lib) no resuelve el prólogo XML ni el DOCTYPE con DTD externo
            // que agregan Illustrator/Inkscape; sin ellos el SVG sí se dibuja en el PDF.
            $raw  = preg_replace(['/<\?xml[^>]*\?>/i', '/<!DOCTYPE[^>]*>/i', '/<!--.*?-->/s'], '', $raw);
            $mime = 'image/svg+xml';
        }
        return "data:{$mime};base64," . base64_encode($raw);
    }
}
