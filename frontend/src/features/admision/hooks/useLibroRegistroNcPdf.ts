import { useState } from 'react'
import apiClient from '../../../config/apiClient'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import { useToastStore } from '../../../store/toastStore'

export function useLibroRegistroNcPdf() {
  const [generando, setGenerando] = useState(false)
  const { toast } = useToastStore()

  const descargar = async () => {
    setGenerando(true)
    toast('Generando Libro Registro NC, por favor espera…', 'info')
    try {
      const response = await apiClient.get('/libro-registro-nc', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      openPdfPreview(blob, `libro-registro-nc-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast('Libro Registro NC generado correctamente.', 'success')
    } catch (err: unknown) {
      console.error('Error generando Libro Registro NC:', err)
      toast('No se pudo generar el PDF. Intenta de nuevo.', 'error')
    } finally {
      setGenerando(false)
    }
  }

  return { descargar, generando }
}
