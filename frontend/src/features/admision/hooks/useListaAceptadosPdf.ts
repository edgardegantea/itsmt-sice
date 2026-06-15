import { useState } from 'react'
import apiClient from '../../../config/apiClient'
import { triggerDownload } from '../../../utils/pdfHelpers'

export function useListaAceptadosPdf() {
  const [generando, setGenerando] = useState(false)

  const descargar = async (periodoId: string, periodoNombre: string) => {
    setGenerando(true)
    try {
      const response = await apiClient.get(
        `/aspirantes/lista-aceptados/${periodoId}/pdf`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      triggerDownload(blob, `lista-aceptados-${periodoNombre.replace(/\s+/g, '-')}.pdf`)
    } catch (err: any) {
      if (err?.response?.status === 404) {
        alert('No hay aspirantes aceptados en este periodo.')
      } else {
        console.error('Error generando PDF:', err)
        alert('No se pudo generar el PDF. Revisa la consola.')
      }
    } finally {
      setGenerando(false)
    }
  }

  return { descargar, generando }
}
