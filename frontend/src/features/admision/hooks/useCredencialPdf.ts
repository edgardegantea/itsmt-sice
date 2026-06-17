import { useState } from 'react'
import type { Alumno } from '../services/admision'
import apiClient from '../../../config/apiClient'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import { useToastStore } from '../../../store/toastStore'

export function useCredencialPdf() {
  const [generando, setGenerando] = useState<string | null>(null)
  const { toast } = useToastStore()

  const descargar = async (alumno: Alumno) => {
    const inscripcionId = alumno.inscripcion?.id
    if (!inscripcionId) {
      toast('El alumno no tiene una inscripción registrada.', 'error')
      return
    }

    setGenerando(alumno.id)
    toast('Generando credencial…', 'info')
    try {
      const response = await apiClient.get(
        `/inscripciones/${inscripcionId}/credencial/pdf`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      openPdfPreview(blob, `credencial-${alumno.numero_control}.pdf`)
      toast('Credencial generada correctamente.', 'success')
    } catch (err) {
      console.error('Error generando credencial:', err)
      toast('No se pudo generar la credencial. Intenta de nuevo.', 'error')
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, generando }
}
