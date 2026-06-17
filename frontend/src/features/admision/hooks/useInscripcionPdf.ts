import { useState } from 'react'
import apiClient from '../../../config/apiClient'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import { useToastStore } from '../../../store/toastStore'

export type TipoInscripcionPdf = 'solicitud' | 'carta-compromiso' | 'carta-compromiso-docs' | 'contrato'

const CONFIG: Record<TipoInscripcionPdf, { endpoint: string; label: string }> = {
  'solicitud':             { endpoint: 'solicitud-inscripcion', label: 'Solicitud de inscripción' },
  'carta-compromiso':      { endpoint: 'carta-compromiso',      label: 'Carta compromiso' },
  'carta-compromiso-docs': { endpoint: 'carta-compromiso-docs', label: 'Carta compromiso documentos' },
  'contrato':              { endpoint: 'contrato-estudiante',   label: 'Contrato estudiantil' },
}

export function useInscripcionPdf() {
  const [generando, setGenerando] = useState<TipoInscripcionPdf | null>(null)
  const { toast } = useToastStore()

  const descargar = async (inscripcionId: string, tipo: TipoInscripcionPdf) => {
    const { endpoint, label } = CONFIG[tipo]
    setGenerando(tipo)
    toast(`Generando ${label}…`, 'info')
    try {
      const response = await apiClient.get(
        `/inscripciones/${inscripcionId}/${endpoint}/pdf`,
        { responseType: 'blob' }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      openPdfPreview(blob, `${tipo}-${inscripcionId}.pdf`)
      toast(`${label} generada correctamente.`, 'success')
    } catch (err) {
      console.error('Error generando PDF:', err)
      toast('No se pudo generar el documento. Intenta de nuevo.', 'error')
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, generando }
}
