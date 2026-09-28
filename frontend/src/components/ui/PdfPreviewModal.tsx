import { useEffect, useCallback } from 'react'
import { usePdfPreviewStore } from '../../store/pdfPreviewStore'
import { Download, FileText, Printer } from 'lucide-react'

export default function PdfPreviewModal() {
  const { blobUrl, filename, close } = usePdfPreviewStore()

  const handleDownload = useCallback(() => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href     = blobUrl
    a.download = filename
    a.click()
  }, [blobUrl, filename])

  const handlePrint = useCallback(() => {
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement | null
    iframe?.contentWindow?.print()
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    if (!blobUrl) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blobUrl, close])

  if (!blobUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-white rounded-xl shadow-2xl ring-1 ring-slate-200 flex flex-col w-full max-w-5xl h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* ícono PDF */}
            <FileText className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700 truncate">{filename}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* Imprimir */}
            <button
              onClick={handlePrint}
              title="Imprimir"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Descargar */}
            <button
              onClick={handleDownload}
              title="Descargar"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            {/* Cerrar */}
            <button
              onClick={close}
              title="Cerrar"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Visor */}
        <div className="flex-1 overflow-hidden rounded-b-xl bg-slate-100">
          <iframe
            id="pdf-preview-iframe"
            src={blobUrl}
            title={filename}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  )
}
