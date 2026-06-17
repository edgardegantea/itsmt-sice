import { useEffect, useCallback } from 'react'
import { usePdfPreviewStore } from '../../store/pdfPreviewStore'

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
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.5 17h-1v-5h1.8c1.1 0 1.7.6 1.7 1.5 0 1-.7 1.5-1.8 1.5H9.5v2zm0-2.8h.7c.5 0 .8-.2.8-.7s-.3-.7-.8-.7H9.5v1.4zm4.5 2.8h-1.4v-5H14c1.4 0 2.2.9 2.2 2.5S15.3 17 14 17zm-.4-4.2h-.6v3.4h.6c.9 0 1.2-.6 1.2-1.7s-.3-1.7-1.2-1.7zm3.9 4.2h-1v-5h2.8v.8H17v1.3h1.9v.8H17V17z"/>
            </svg>
            <span className="text-sm font-medium text-slate-700 truncate">{filename}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* Imprimir */}
            <button
              onClick={handlePrint}
              title="Imprimir"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75v3.75h10.5v-3.75M6.75 8.25V3.75h10.5v4.5M4.5 8.25h15A1.5 1.5 0 0 1 21 9.75v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.75v-6a1.5 1.5 0 0 1 1.5-1.5z" />
              </svg>
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Descargar */}
            <button
              onClick={handleDownload}
              title="Descargar"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
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
