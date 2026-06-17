import { useState } from 'react'
import apiClient from '../../../config/apiClient'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import { useToastStore } from '../../../store/toastStore'

export function useListaAceptadosPorCarreraPdf() {
  const [generando, setGenerando] = useState(false)
  const { toast } = useToastStore()

  const descargar = async (periodoId: string, periodoNombre?: string) => {
    setGenerando(true)
    toast('Generando lista de aceptados por carrera…', 'info')
    try {
      const response = await apiClient.get(
        `/aspirantes/lista-aceptados-por-carrera/${periodoId}/pdf`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const nombre = periodoNombre ? `lista-aceptados-por-carrera-${periodoNombre.replace(/\s+/g,'-')}.pdf` : 'lista-aceptados-por-carrera.pdf'
      openPdfPreview(blob, nombre)
      toast('PDF generado correctamente.', 'success')
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast('No hay aspirantes aceptados en este periodo.', 'error')
      } else {
        console.error('Error generando PDF:', err)
        toast('No se pudo generar el PDF. Intenta de nuevo.', 'error')
      }
    } finally {
      setGenerando(false)
    }
  }

  return { descargar, generando }
}
