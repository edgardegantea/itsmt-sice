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
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio_actualizacion_datos' => 'date',
            'fecha_fin_actualizacion_datos'    => 'date',
            'login_opacidad_fondo'             => 'float',
            'maestria_habilitada'              => 'boolean',
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
        if ($this->logo_principal && Storage::disk('public')->exists($this->logo_principal)) {
            $mime = Storage::disk('public')->mimeType($this->logo_principal);
            $data = base64_encode(Storage::disk('public')->get($this->logo_principal));
            return "data:{$mime};base64,{$data}";
        }
        return null;
    }
}
