import { useState } from 'react'
import apiClient from '../../../config/apiClient'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import { useToastStore } from '../../../store/toastStore'

export function useCargaAcademicaPdf() {
  const [generando, setGenerando] = useState<string | null>(null)
  const { toast } = useToastStore()

  const descargar = async (alumnoId: string, periodoId: string) => {
    const key = `${alumnoId}-${periodoId}`
    setGenerando(key)
    toast('Generando PDF de carga académica…', 'info')
    try {
      const response = await apiClient.get(
        `/alumnos/${alumnoId}/carga-academica/${periodoId}/pdf`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      openPdfPreview(blob, `carga-academica-${alumnoId}.pdf`)
      toast('PDF de carga académica generado correctamente.', 'success')
    } catch (err) {
      console.error('Error generando carga académica PDF:', err)
      toast('No se pudo generar el PDF. Intenta de nuevo.', 'error')
    } finally {
      setGenerando(null)
    }
  }

  const descargarGrupo = async (grupoId: string, grupoLabel: string, periodoId: string) => {
    const key = `grupo-${grupoId}-${periodoId}`
    setGenerando(key)
    toast(`Generando PDF del grupo ${grupoLabel}… (puede tardar unos segundos)`, 'info')
    try {
      const response = await apiClient.get(
        `/grupos/${grupoId}/carga-academica/${periodoId}/pdf`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      openPdfPreview(blob, `carga-academica-grupo-${grupoLabel}.pdf`)
      toast('PDF del grupo generado correctamente.', 'success')
    } catch (err) {
      console.error('Error generando PDF por grupo:', err)
      toast('No se pudo generar el PDF del grupo. Verifica que el grupo tenga alumnos.', 'error')
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, descargarGrupo, generando }
}
