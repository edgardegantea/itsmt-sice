import { useState, createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { admisionApi } from '../services/admision'
import { configuracionApi } from '../../admin/services/configuracion'
import SolicitudInscripcionPdf    from '../pdf/SolicitudInscripcionPdf'
import CartaCompromisoPdf         from '../pdf/CartaCompromisoPdf'
import CartaCompromisoDocsPdf     from '../pdf/CartaCompromisoDocsPdf'
import ContratoEstudiantePdf      from '../pdf/ContratoEstudiantePdf'
import { openPdfPreview } from '../../../utils/pdfHelpers'

export type TipoInscripcionPdf = 'solicitud' | 'carta-compromiso' | 'carta-compromiso-docs' | 'contrato'

const CONFIG: Record<TipoInscripcionPdf, { component: any; sufijo: string }> = {
  'solicitud':              { component: SolicitudInscripcionPdf,  sufijo: 'SI'  },
  'carta-compromiso':       { component: CartaCompromisoPdf,        sufijo: 'CC'  },
  'carta-compromiso-docs':  { component: CartaCompromisoDocsPdf,    sufijo: 'CCD' },
  'contrato':               { component: ContratoEstudiantePdf,     sufijo: 'CT'  },
}

export function useInscripcionPdf() {
  const [generando, setGenerando] = useState<TipoInscripcionPdf | null>(null)

  const descargar = async (inscripcionId: string, tipo: TipoInscripcionPdf) => {
    setGenerando(tipo)
    try {
      const [inscripcion, cfg] = await Promise.all([
        admisionApi.getInscripcion(inscripcionId),
        configuracionApi.get(),
      ])

      const cfgPdf = { ...cfg, logoBase64: cfg.logo_base64 ?? null }

      const { component, sufijo } = CONFIG[tipo]
      const doc = createElement(component, { inscripcion, cfg: cfgPdf })

      const blob = await pdf(doc as any).toBlob()
      openPdfPreview(blob, `${inscripcion.numero_control}-${sufijo}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
      alert('No se pudo generar el documento. Revisa la consola.')
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, generando }
}
