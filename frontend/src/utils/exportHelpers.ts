/**
 * Exporta un arreglo de objetos a un archivo CSV descargable
 */
export function exportToCsv(filename: string, rows: Record<string, unknown>[], headers?: Record<string, string>) {
  if (!rows || !rows.length) return

  const keys = Object.keys(headers || rows[0])
  const headerRow = keys.map(k => (headers ? headers[k] : k)).join(',')

  const csvRows = rows.map(row => {
    return keys
      .map(key => {
        const val = row[key] ?? ''
        const escaped = String(val).replace(/"/g, '""')
        return `"${escaped}"`
      })
      .join(',')
  })

  const csvContent = '\uFEFF' + [headerRow, ...csvRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Dispara la impresión optimizada del documento actual
 */
export function triggerPrint() {
  window.print()
}
