export async function urlToBase64(url: string): Promise<string | null> {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 15_000)
}

/**
 * Abre el PDF en el visor modal integrado de la aplicación.
 * El store gestiona el ciclo de vida del blob URL.
 */
export function openPdfPreview(blob: Blob, filename?: string): void {
  // Importación dinámica para evitar ciclo de dependencias al inicializar el store
  import('../store/pdfPreviewStore').then(({ usePdfPreviewStore }) => {
    usePdfPreviewStore.getState().open(blob, filename)
  })
}

export function fmtFecha(iso: string): string {
  const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                 'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

export function today(): string {
  return fmtFecha(new Date().toISOString().slice(0, 10))
}
