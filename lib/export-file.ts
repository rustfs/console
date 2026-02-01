export function download(filename: string, text: string) {
  const element = document.createElement("a")
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
  element.setAttribute("download", filename)
  element.style.display = "none"
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

export interface ExportFileRes {
  headers: Record<string, string>
  data: Blob
}

/**
 * Export blob file with content-type headers
 */
export function exportFile(res: ExportFileRes, fileName: string) {
  const file = res.data
  const name = decodeURIComponent(res.headers.filename ?? "")

  if (
    typeof window !== "undefined" &&
    "navigator" in window &&
    "msSaveOrOpenBlob" in window.navigator
  ) {
    const blob = new Blob([file], { type: res.headers["content-type"] ?? "application/octet-stream" })
    ;(window.navigator as unknown as { msSaveOrOpenBlob: (blob: Blob, name: string) => void }).msSaveOrOpenBlob(
      blob,
      fileName || name
    )
  } else {
    const type = res.headers["content-type"] ?? "application/octet-stream"
    const objectUrl = window.URL.createObjectURL(new Blob([file], { type }))
    const link = document.createElement("a")
    link.download = fileName || name
    link.href = objectUrl
    link.click()
    window.URL.revokeObjectURL(objectUrl)
  }
}
