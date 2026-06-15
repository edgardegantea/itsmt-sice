import { useState, createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { admisionApi } from '../services/admision'
import { configuracionApi } from '../../admin/services/configuracion'
import LibroRegistroNcPdf from '../pdf/LibroRegistroNcPdf'
import { triggerDownload } from '../../../utils/pdfHelpers'

async function getAllAlumnos() {
  const primera = await admisionApi.getAlumnos({ page: 1 })
  const { last_page, data } = primera as any
  let todos = [...data]
  if (last_page > 1) {
    const resto = await Promise.all(
      Array.from({ length: last_page - 1 }, (_, i) =>
        admisionApi.getAlumnos({ page: i + 2 })
      )
    )
    resto.forEach((p: any) => todos.push(...p.data))
  }
  return todos
}

export function useLibroRegistroNcPdf() {
  const [generando, setGenerando] = useState(false)

  const descargar = async () => {
    setGenerando(true)
    try {
      const [alumnos, cfg] = await Promise.all([
        getAllAlumnos(),
        configuracionApi.get(),
      ])

      if (alumnos.length === 0) {
        alert('No hay alumnos registrados.')
        return
      }

      const doc = createElement(LibroRegistroNcPdf, {
        alumnos,
        cfg: { ...cfg, logoBase64: cfg.logo_base64 ?? null },
      })

      const blob = await pdf(doc).toBlob()
      const fecha = new Date().toISOString().slice(0,10)
      triggerDownload(blob, `libro-registro-nc-${fecha}.pdf`)
    } catch (err) {
      console.error('Error generando Libro Registro NC:', err)
      alert('No se pudo generar el PDF. Revisa la consola.')
    } finally {
      setGenerando(false)
    }
  }

  return { descargar, generando }
}
