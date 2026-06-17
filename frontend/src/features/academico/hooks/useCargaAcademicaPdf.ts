import { useState, createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import apiClient from '../../../config/apiClient'
import { configuracionApi } from '../../admin/services/configuracion'
import CargaAcademicaPdf from '../pdf/CargaAcademicaPdf'

export function useCargaAcademicaPdf() {
  const [generando, setGenerando] = useState<string | null>(null)

  const descargar = async (alumnoId: string, periodoId: string) => {
    const key = `${alumnoId}-${periodoId}`
    setGenerando(key)

    try {
      const [alumnoRes, cargas, horariosRes, cfg] = await Promise.all([
        apiClient.get(`/alumnos/${alumnoId}`).then(r => r.data.data),
        apiClient.get('/cargas-academicas', { params: { periodo_id: periodoId } }).then(r => r.data.data as any[]),
        apiClient.get('/horarios', { params: { periodo_id: periodoId } }).then(r => r.data.data as any[]),
        configuracionApi.get(),
      ])

      const periodoRes = await apiClient.get('/admin/periodos').then(r =>
        (r.data.data as any[]).find((p: any) => p.id === periodoId)
      )

      // Filtrar cargas del alumno: busca el grupo al que pertenece el alumno
      const alumnoGrupoIds: string[] = (alumnoRes.grupos ?? []).map((g: any) => g.id)

      const asignaturas = cargas
        .filter((c: any) => alumnoGrupoIds.includes(c.grupo_id))
        .map((c: any) => ({
          id:        c.id,
          materia:   c.materia,
          grupo:     c.grupo,
          docente:   c.docente,
          aula:      c.aula,
          horarios:  horariosRes.filter((h: any) => h.carga_academica_id === c.id),
          es_repeticion: false,
        }))

      const doc = createElement(CargaAcademicaPdf, {
        alumno:   alumnoRes,
        periodo:  periodoRes ?? { nombre: '—' },
        asignaturas,
        configuracion: {
          nombre_institucion: cfg.nombre_institucion,
          logo_base64:        cfg.logo_base64 ?? undefined,
        },
        firmantes: {
          jefe_division: cfg.subdirector_academico ?? undefined,
          nombre_director: cfg.responsable_servicios_escolares ?? undefined,
        },
      })

      const blob = await pdf(doc as any).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `CargaAcademica_${alumnoRes.numero_control}_${periodoRes?.nombre?.replace(/\s/g, '_') ?? periodoId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, generando }
}
