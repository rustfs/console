/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromFilename(filename) {
  const lowerFilename = filename.toLowerCase()

  // Compound archive names must be checked before the final extension.
  const compoundMimeTypes = [
    [".tar.gz", "application/gzip"],
    [".tar.bz2", "application/x-bzip2"],
    [".tar.xz", "application/x-xz"],
    [".tar.zst", "application/zstd"],
  ]
  const compoundType = compoundMimeTypes.find(([suffix]) => lowerFilename.endsWith(suffix))
  if (compoundType) return compoundType[1]

  const ext = lowerFilename.split(".").pop() ?? ""

  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
    mp4: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    mkv: "video/x-matroska",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
    aac: "audio/aac",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.document",
    txt: "text/plain",
    csv: "text/csv",
    rtf: "application/rtf",
    zip: "application/zip",
    apk: "application/vnd.android.package-archive",
    deb: "application/vnd.debian.binary-package",
    iso: "application/x-iso9660-image",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    bz2: "application/x-bzip2",
    xz: "application/x-xz",
    zst: "application/zstd",
    tgz: "application/x-compressed",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    jsonl: "application/x-ndjson",
    ndjson: "application/x-ndjson",
    xml: "application/xml",
    wasm: "application/wasm",
    ttf: "font/ttf",
    otf: "font/otf",
    woff: "font/woff",
    woff2: "font/woff2",
    eot: "application/vnd.ms-fontobject",
    epub: "application/epub+zip",
    sql: "application/sql",
  }

  return mimeTypes[ext] ?? "application/octet-stream"
}

/**
 * Get content type from response headers or infer from filename
 */
export function getContentType(headers, filename) {
  const contentType = headers.get("content-type")
  if (contentType) return contentType
  return getMimeTypeFromFilename(filename)
}
