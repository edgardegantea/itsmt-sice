import { useState } from 'react'
import type { Constancia } from '../services/permanencia'
import apiClient from '../../../config/apiClient'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import { useToastStore } from '../../../store/toastStore'

export function useConstanciaPdf() {
  const [generando, setGenerando] = useState<string | null>(null)
  const { toast } = useToastStore()

  const descargar = async (constancia: Constancia) => {
    setGenerando(constancia.id)
    toast('Generando constancia PDF…', 'info')
    try {
      const response = await apiClient.get(
        `/constancias/${constancia.id}/pdf`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const folio = (constancia as any).folio_unico ?? 'constancia'
      openPdfPreview(blob, `${folio}.pdf`)
      toast('Constancia generada correctamente.', 'success')
    } catch (err: any) {
      console.error('Error generando constancia:', err)
      const msg = err?.response?.data?.message ?? 'No se pudo generar el PDF. Intenta de nuevo.'
      toast(msg, 'error')
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, generando }
}
