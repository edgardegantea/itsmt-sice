import { useState, createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { permanenciaApi, type Constancia } from '../services/permanencia'
import { configuracionApi } from '../../admin/services/configuracion'
import ConstanciaPdf from '../pdf/ConstanciaPdf'
import { triggerDownload } from '../../../utils/pdfHelpers'

export function useConstanciaPdf() {
  const [generando, setGenerando] = useState<string | null>(null)

  const descargar = async (constancia: Constancia) => {
    setGenerando(constancia.id)
    try {
      const [constanciaDetalle, cfg] = await Promise.all([
        permanenciaApi.getConstanciasAlumno(constancia.alumno_id).then(cs => cs.find(c => c.id === constancia.id) ?? constancia),
        configuracionApi.get(),
      ])

      const doc = createElement(ConstanciaPdf, {
        constancia: constanciaDetalle as any,
        cfg: {
          nombre_institucion: cfg.nombre_institucion,
          nombre_corto:       cfg.nombre_corto,
          dependencia:        cfg.dependencia,
          clave_tecnm:        cfg.clave_tecnm,
          logoBase64:         cfg.logo_base64 ?? null,
        },
      })

      const blob = await pdf(doc).toBlob()
      triggerDownload(blob, `${constanciaDetalle.folio_unico}.pdf`)
    } catch (err) {
      console.error('Error generando constancia:', err)
      alert('No se pudo generar el PDF.')
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, generando }
}
