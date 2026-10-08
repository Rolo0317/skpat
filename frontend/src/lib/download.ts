/** BOM para que Excel abra los CSV como UTF-8 (tildes y eñes). */
const UTF8_BOM = '﻿'
const CSV_MIME_TYPE = 'text/csv;charset=utf-8'

function clickDownloadLink(href: string, filename: string): void {
  Object.assign(document.createElement('a'), { href, download: filename }).click()
}

/** Descarga un CSV generado en el navegador. */
export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([UTF8_BOM, content], { type: CSV_MIME_TYPE }))
  clickDownloadLink(url, filename)
  URL.revokeObjectURL(url)
}

/** Descarga un data URL (p. ej. el PNG de un QR) con el nombre indicado. */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  clickDownloadLink(dataUrl, filename)
}
