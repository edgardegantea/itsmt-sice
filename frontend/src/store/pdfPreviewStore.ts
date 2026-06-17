import { create } from 'zustand'

interface PdfPreviewStore {
  blobUrl:   string | null
  filename:  string
  open:      (blob: Blob, filename?: string) => void
  close:     () => void
}

export const usePdfPreviewStore = create<PdfPreviewStore>((set, get) => ({
  blobUrl:  null,
  filename: 'documento.pdf',

  open: (blob, filename = 'documento.pdf') => {
    const prev = get().blobUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ blobUrl: URL.createObjectURL(blob), filename })
  },

  close: () => {
    const url = get().blobUrl
    if (url) URL.revokeObjectURL(url)
    set({ blobUrl: null })
  },
}))
