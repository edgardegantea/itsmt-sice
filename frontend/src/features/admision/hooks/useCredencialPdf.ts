import { useState, createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import type { Alumno } from '../services/admision'
import CredencialPdf from '../pdf/CredencialPdf'
import { triggerDownload } from '../../../utils/pdfHelpers'

export function useCredencialPdf() {
  const [generando, setGenerando] = useState<string | null>(null)

  const descargar = async (alumno: Alumno) => {
    setGenerando(alumno.id)
    try {
      const doc  = createElement(CredencialPdf, { alumno })
      const blob = await pdf(doc).toBlob()
      triggerDownload(blob, `credencial-${alumno.numero_control}.pdf`)
    } catch (err) {
      console.error('Error generando credencial:', err)
      alert('No se pudo generar la credencial. Revisa la consola.')
    } finally {
      setGenerando(null)
    }
  }

  return { descargar, generando }
}
