/**
 * 导出文件-字节流
 *
 * @export
 * @param {Object} res 接口返回字段
 * @param {string} fileName 文件名
 */
export function exportFile(res: any, fileName: string) {
  const file = res.data
  const name = decodeURI(res.headers.filename || '')
  // 兼容IE浏览器
  // 兼容IE浏览器
  if (typeof window !== 'undefined' && (window as any).navigator && (window as any).navigator.msSaveOrOpenBlob) {
    const blob = new Blob([file], { type: res.headers['content-type'] })
    ;(window.navigator as any).msSaveOrOpenBlob(blob, fileName || name)
  } else {
    const objectUrl = window.URL.createObjectURL(new Blob([file], { type: res.headers['content-type'] }))
    const link = document.createElement('a')
    link.download = fileName || name
    link.href = objectUrl
    link.click()
  }
}
/**
 * 下载文件-链接下载
 *
 * @export
 * @param {string} url 下载地址
 * @param {string} fileName 文件名
 */
export function downFile(url: string, fileName: string) {
  const link = document.createElement('a') // 创建a标签
  link.style.display = 'none'

  link.href = url
  link.download = fileName

  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    document.body.removeChild(link)
  }, 3000)
}
/**
 * 下载本地文件 public static 文件夹下存放
 *
 * @export
 * @param {string} url 下载地址
 * @param {string} fileName 文件名
 */
const { NODE_ENV } = process.env
export function downLocality(url: string, fileName: string) {
  const path = removeLeadingTrailingSlashes(url)
  const a = document.createElement('a')
  document.body.appendChild(a)
  a.href =
    NODE_ENV === 'production'
      ? `/mkwszc-web-kd/static/${path ? path + '/' : ''}${fileName}`
      : `/static/${path ? path + '/' : ''}${fileName}`
  a.download = `${fileName}`
  a.style.display = 'none'
  a.click()
  document.body.removeChild(a)
}

function removeLeadingTrailingSlashes(path: string) {
  // 去除开头的斜杠
  while (path.charAt(0) === '/') {
    path = path.slice(1)
  }

  // 去除结尾的斜杠
  while (path.charAt(path.length - 1) === '/') {
    path = path.slice(0, -1)
  }

  return path
}

/**
 * 字符串导出为文件
 * @param filename
 * @param text
 */
export function download(filename: string, text: string) {
  let element = document.createElement('a')
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + text)
  element.setAttribute('download', filename)

  element.style.display = 'none'
  document.body.appendChild(element)

  element.click()
  document.body.removeChild(element)
}
