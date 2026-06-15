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
    ];

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

    public function logoBase64(): ?string
    {
        if ($this->logo_principal && Storage::disk('public')->exists($this->logo_principal)) {
            $mime = Storage::disk('public')->mimeType($this->logo_principal);
            $data = base64_encode(Storage::disk('public')->get($this->logo_principal));
            return "data:{$mime};base64,{$data}";
        }
        $svgPath = public_path('assets/img/logo/ic_imt.svg');
        if (file_exists($svgPath)) {
            $data = base64_encode(file_get_contents($svgPath));
            return "data:image/svg+xml;base64,{$data}";
        }
        return null;
    }
}
