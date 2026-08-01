<?php

namespace App\Domains\Vinculacion\Services;

use App\Domains\Academico\Models\Alumno;
use App\Domains\Academico\Models\Calificacion;
use App\Domains\Academico\Models\MallaCurricular;
use App\Domains\Calidad\Models\ActividadComplementaria;
use App\Domains\Calidad\Models\TipoActividad;
use App\Domains\Vinculacion\Models\ServicioSocial;

/**
 * Verifica los prerequisitos TecNM (política 3.4.5, PO-004) para solicitar y
 * avanzar en Residencia Profesional: SS acreditado, TODAS las actividades
 * complementarias oficiales completadas (no solo una), ≥80% de créditos,
 * no estar cursando una materia en oportunidad "especial", y estar dentro de
 * los primeros 12 semestres. Centraliza la lógica para que se aplique de
 * forma consistente en el envío de la solicitud, el dictamen y la asignación
 * de asesor (antes cada punto verificaba distinto, o no verificaba nada).
 */
class PrerequisitosResidenciaService
{
    public function verificar(Alumno $alumno): array
    {
        $ssAcreditado = ServicioSocial::where('alumno_id', $alumno->id)
            ->where('estatus', 'acreditado')
            ->exists();

        [$acCompletadas, $acFaltantes] = $this->verificarActividadesComplementarias($alumno);

        $creditos = $this->porcentajeCreditos($alumno);
        $dentroLimite = $alumno->semestre_actual <= 12;
        $enCursoEspecial = Calificacion::where('alumno_id', $alumno->id)
            ->where('tipo_curso', 'especial')
            ->whereNull('acreditado')
            ->exists();

        return [
            'ss_acreditado'           => $ssAcreditado,
            'ac_completadas'          => $acCompletadas,
            'ac_faltantes'            => $acFaltantes,
            'porcentaje_creditos'     => $creditos['porcentaje'],
            'creditos_acreditados'    => $creditos['acreditados'],
            'creditos_totales'        => $creditos['total'],
            'dentro_limite_semestres' => $dentroLimite,
            'semestre_actual'         => $alumno->semestre_actual,
            'no_en_curso_especial'    => ! $enCursoEspecial,
            'puede_solicitar_rp'      => $ssAcreditado && $acCompletadas
                && $creditos['porcentaje'] >= 80 && $dentroLimite && ! $enCursoEspecial,
        ];
    }

    public function cumple(Alumno $alumno): bool
    {
        return $this->verificar($alumno)['puede_solicitar_rp'];
    }

    /** @return array{0: bool, 1: array<int, array{clave:string,nombre:string}>} */
    private function verificarActividadesComplementarias(Alumno $alumno): array
    {
        $tipos = TipoActividad::where('activo', true)->get();

        if ($tipos->isEmpty()) {
            return [true, []];
        }

        $horasValidadasPorTipo = ActividadComplementaria::where('alumno_id', $alumno->id)
            ->where('estatus', 'validada')
            ->selectRaw('tipo_id, SUM(horas) as horas')
            ->groupBy('tipo_id')
            ->pluck('horas', 'tipo_id');

        $faltantes = [];
        foreach ($tipos as $tipo) {
            $horas = (float) ($horasValidadasPorTipo[$tipo->id] ?? 0);
            if ($horas < (float) $tipo->horas_requeridas) {
                $faltantes[] = ['clave' => $tipo->clave, 'nombre' => $tipo->nombre];
            }
        }

        return [empty($faltantes), $faltantes];
    }

    public function porcentajeCreditos(Alumno $alumno): array
    {
        $total = MallaCurricular::where('mallas_curriculares.carrera_id', $alumno->carrera_id)
            ->join('materias', 'mallas_curriculares.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        if ($total == 0) {
            return ['porcentaje' => 0, 'acreditados' => 0, 'total' => 0];
        }

        $acreditados = Calificacion::where('calificaciones.alumno_id', $alumno->id)
            ->where('calificaciones.acreditado', true)
            ->join('carga_academica_grupo', 'calificaciones.grupo_id', '=', 'carga_academica_grupo.grupo_id')
            ->join('cargas_academicas', 'carga_academica_grupo.carga_academica_id', '=', 'cargas_academicas.id')
            ->join('materias', 'cargas_academicas.materia_id', '=', 'materias.id')
            ->sum('materias.creditos');

        $porcentaje = round(($acreditados / $total) * 100, 1);

        return ['porcentaje' => $porcentaje, 'acreditados' => (int) $acreditados, 'total' => (int) $total];
    }
}
