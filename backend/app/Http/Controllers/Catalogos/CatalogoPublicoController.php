<?php

namespace App\Http\Controllers\Catalogos;

use App\Domains\Admision\Models\Aspirante;
use App\Domains\Catalogos\Models\EscuelaBachillerato;
use App\Domains\Catalogos\Models\Estado;
use App\Domains\Catalogos\Models\Municipio;
use App\Domains\Catalogos\Models\Turno;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class CatalogoPublicoController extends Controller
{
    public function estados(): JsonResponse
    {
        return ApiResponse::success(Estado::orderBy('nombre')->get(['id', 'nombre', 'clave_curp']));
    }

    public function crearMunicipio(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'    => ['required', 'string', 'max:150'],
            'estado_id' => ['nullable', 'integer', 'exists:estados,id'],
        ]);

        $municipio = Municipio::firstOrCreate([
            'nombre'    => mb_convert_case(trim($data['nombre']), MB_CASE_TITLE, 'UTF-8'),
            'estado_id' => $data['estado_id'] ?? null,
        ]);

        return ApiResponse::success($municipio->only(['id', 'nombre', 'estado_id']));
    }

    public function crearEscuela(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'       => ['required', 'string', 'max:200'],
            'municipio_id' => ['nullable', 'integer', 'exists:municipios,id'],
        ]);

        $escuela = EscuelaBachillerato::firstOrCreate(
            [
                'nombre'       => mb_convert_case(trim($data['nombre']), MB_CASE_TITLE, 'UTF-8'),
                'municipio_id' => $data['municipio_id'] ?? null,
            ],
            ['tipo' => 'otra', 'activa' => true]
        );

        return ApiResponse::success($escuela->only(['id', 'nombre', 'tipo', 'municipio_id']));
    }

    public function municipios(Request $request): JsonResponse
    {
        $query = Municipio::orderBy('nombre')->select('id', 'estado_id', 'nombre');
        if ($request->estado_id) {
            $query->where('estado_id', $request->estado_id);
        }
        return ApiResponse::success($query->get());
    }

    public function escuelas(Request $request): JsonResponse
    {
        $query = EscuelaBachillerato::where('activa', true)->orderBy('nombre')->select('id', 'municipio_id', 'nombre', 'tipo');
        if ($request->municipio_id) {
            $query->where('municipio_id', $request->municipio_id);
        } elseif ($request->estado_id) {
            $query->whereHas('municipio', fn($q) => $q->where('estado_id', $request->estado_id));
        }
        return ApiResponse::success($query->get());
    }

    public function turnos(): JsonResponse
    {
        return ApiResponse::success(Turno::where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'clave']));
    }

    public function consultarRenapo(string $curp): JsonResponse
    {
        $curp = strtoupper(trim($curp));

        if (! preg_match('/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/', $curp)) {
            return ApiResponse::error('CURP con formato inválido', 422);
        }

        $derivados = $this->derivarDesdeCurp($curp);

        try {
            $res = Http::timeout(10)
                ->withoutVerifying()
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get('https://curp.renapo.gob.mx/RNEC/ConsultaCURP.do', ['curp' => $curp]);

            if (! $res->successful()) {
                return ApiResponse::success(array_merge($derivados, ['fuente' => 'curp']));
            }

            return ApiResponse::success(array_merge(
                $this->parsearRespuestaRenapo($res->body(), $derivados),
                ['fuente' => 'renapo']
            ));
        } catch (\Throwable) {
            return ApiResponse::success(array_merge($derivados, ['fuente' => 'curp']));
        }
    }

    public function verificarCurp(string $curp): JsonResponse
    {
        $curp      = strtoupper(trim($curp));
        $aspirante = Aspirante::where('curp', $curp)->first();

        if (! $aspirante) {
            return ApiResponse::success(['registrado' => false]);
        }

        return ApiResponse::success([
            'registrado' => true,
            'estatus'    => $aspirante->estatus,
            'periodo'    => $aspirante->periodo?->nombre,
        ]);
    }

    private function derivarDesdeCurp(string $curp): array
    {
        $yy   = substr($curp, 4, 2);
        $mm   = substr($curp, 6, 2);
        $dd   = substr($curp, 8, 2);
        $year = (int)$yy <= 30 ? "20{$yy}" : "19{$yy}";

        $claveEdo = substr($curp, 11, 2);
        $mapaEdos = [
            'AS'=>'Aguascalientes','BC'=>'Baja California','BS'=>'Baja California Sur',
            'CC'=>'Campeche','CL'=>'Coahuila','CM'=>'Colima','CS'=>'Chiapas','CH'=>'Chihuahua',
            'DF'=>'Ciudad de México','DG'=>'Durango','MC'=>'Estado de México','GT'=>'Guanajuato',
            'GR'=>'Guerrero','HG'=>'Hidalgo','JC'=>'Jalisco','MN'=>'Michoacán','MS'=>'Morelos',
            'NT'=>'Nayarit','NL'=>'Nuevo León','OC'=>'Oaxaca','PL'=>'Puebla','QT'=>'Querétaro',
            'QR'=>'Quintana Roo','SP'=>'San Luis Potosí','SL'=>'Sinaloa','SR'=>'Sonora',
            'TC'=>'Tabasco','TS'=>'Tamaulipas','TL'=>'Tlaxcala','VZ'=>'Veracruz',
            'YN'=>'Yucatán','ZS'=>'Zacatecas','NE'=>'Extranjero',
        ];

        return [
            'fecha_nacimiento'  => "{$year}-{$mm}-{$dd}",
            'sexo'              => $curp[10] === 'H' ? 'masculino' : 'femenino',
            'estado_nacimiento' => $mapaEdos[$claveEdo] ?? null,
            'nombres'           => null,
            'apellido_paterno'  => null,
            'apellido_materno'  => null,
        ];
    }

    private function parsearRespuestaRenapo(string $html, array $derivados): array
    {
        $get = function (string $id) use ($html): ?string {
            if (preg_match('/<(?:span|td|div|input)[^>]+id=["\']' . preg_quote($id, '/') . '["\'][^>]*>([^<]*)</', $html, $m)) {
                $val = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                return $val !== '' ? $val : null;
            }
            if (preg_match('/<input[^>]+id=["\']' . preg_quote($id, '/') . '["\'][^>]+value=["\']([^"\']*)["\']/', $html, $m)) {
                $val = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
                return $val !== '' ? $val : null;
            }
            return null;
        };

        $paterno = $get('PATERNO') ?? $get('paterno') ?? $get('apellidoPaterno');
        $materno = $get('MATERNO') ?? $get('materno') ?? $get('apellidoMaterno');
        $nombres = $get('NOMBRE')  ?? $get('NOMBRES') ?? $get('nombre') ?? $get('nombres');
        $fecNac  = $get('NACIMIENTO') ?? $get('FECNAC') ?? $get('fechaNacimiento');
        $entidad = $get('ENTIDAD') ?? $get('ESTADO') ?? $get('estadoNacimiento');

        $fechaNac = $derivados['fecha_nacimiento'];
        if ($fecNac && preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $fecNac, $fm)) {
            $fechaNac = "{$fm[3]}-{$fm[2]}-{$fm[1]}";
        }

        return [
            'nombres'           => $this->limpiarNombre($nombres),
            'apellido_paterno'  => $this->limpiarNombre($paterno),
            'apellido_materno'  => $this->limpiarNombre($materno),
            'fecha_nacimiento'  => $fechaNac,
            'sexo'              => $derivados['sexo'],
            'estado_nacimiento' => $entidad ?? $derivados['estado_nacimiento'],
        ];
    }

    private function limpiarNombre(?string $nombre): ?string
    {
        if ($nombre === null || trim($nombre) === '') return null;
        return mb_convert_case(preg_replace('/\s+/', ' ', trim($nombre)), MB_CASE_TITLE, 'UTF-8');
    }
}
