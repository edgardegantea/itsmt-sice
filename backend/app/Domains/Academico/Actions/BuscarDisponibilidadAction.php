<?php

namespace App\Domains\Academico\Actions;

use App\Domains\Academico\Models\Aula;
use App\Models\User;

/**
 * Herramienta de búsqueda: dado un grupo (o grupos) + materia, enumera
 * combinaciones día×hora×docente×aula libres (sin conflictos y dentro de la
 * disponibilidad declarada), hasta un máximo de 15 propuestas. Es una
 * enumeración exhaustiva acotada, no un optimizador — igual que
 * BuscarDisponibilidadAction de propuestahorarios.
 */
class BuscarDisponibilidadAction
{
    private const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    private const HORA_INICIO = 7;
    private const HORA_FIN = 20;
    private const MAX_PROPUESTAS = 15;

    public function __construct(private VerificarDisponibilidadAction $verificar) {}

    /**
     * @param array<string> $grupoIds
     * @return array<int, array{dia_semana: string, hora_inicio: string, hora_fin: string, docente_id: string, docente_nombre: string, aula_id: ?string, aula_nombre: ?string}>
     */
    public function buscar(
        string $periodoId,
        string $materiaId,
        array $grupoIds,
        ?string $carreraId = null,
        ?string $docenteIdFiltro = null,
        ?string $diaFiltro = null,
    ): array {
        $docentes = User::role(['docente', 'jefe_carrera', 'director_academico'])
            ->when($carreraId, fn ($q) => $q->deCarrera($carreraId))
            ->when($docenteIdFiltro, fn ($q) => $q->where('id', $docenteIdFiltro))
            ->get(['id', 'name']);

        $aulas = Aula::where('activa', true)->get(['id', 'nombre']);
        // null = sin aula asignada, también es una propuesta válida
        $opcionesAula = $aulas->map(fn ($a) => ['id' => $a->id, 'nombre' => $a->nombre])
            ->push(['id' => null, 'nombre' => null]);

        $dias = $diaFiltro ? [$diaFiltro] : self::DIAS;
        $propuestas = [];

        foreach ($dias as $dia) {
            for ($h = self::HORA_INICIO; $h < self::HORA_FIN; $h++) {
                $horaInicio = sprintf('%02d:00', $h);
                $horaFin    = sprintf('%02d:00', $h + 1);

                foreach ($docentes as $docente) {
                    foreach ($opcionesAula as $aula) {
                        $resultado = $this->verificar->ejecutar(
                            periodoId:  $periodoId,
                            docenteId:  $docente->id,
                            diaSemana:  $dia,
                            horaInicio: $horaInicio,
                            horaFin:    $horaFin,
                            aulaId:     $aula['id'],
                            grupoIds:   $grupoIds,
                            materiaId:  $materiaId,
                        );

                        if (empty($resultado['conflictos']) && $resultado['dentro_disponibilidad']) {
                            $propuestas[] = [
                                'dia_semana'     => $dia,
                                'hora_inicio'    => $horaInicio,
                                'hora_fin'       => $horaFin,
                                'docente_id'     => $docente->id,
                                'docente_nombre' => $docente->name,
                                'aula_id'        => $aula['id'],
                                'aula_nombre'    => $aula['nombre'],
                            ];

                            if (count($propuestas) >= self::MAX_PROPUESTAS) {
                                return $propuestas;
                            }
                        }
                    }
                }
            }
        }

        return $propuestas;
    }
}
