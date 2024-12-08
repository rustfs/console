// 定义单位
const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
const K8S_UNITS = ['B', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi']

/**
 * 将字节数转换为可读格式
 * @param {string} x - 字节数的字符串表示
 * @param {boolean} isK8sUnits - 是否使用 K8s 单位
 * @returns {string} - 可读格式的字节数
 */
export function niceBytes(x: string, isK8sUnits: boolean = false): string {
  const n = Number.parseInt(x, 10) || 0
  return formatBytes(n, isK8sUnits)
}

/**
 * 将整数字节数转换为可读格式
 * @param {number} n - 字节数
 * @param {boolean} isK8sUnits - 是否使用 K8s 单位
 * @returns {string} - 可读格式的字节数
 */
export function formatBytes(n: number, isK8sUnits: boolean = false): string {
  const l = Math.floor(Math.log(n) / Math.log(1024)) || 0

  if (l < 0) {
    return '0 B'
  }
  const value = n / 1024 ** l
  return `${value.toFixed(1)} ${isK8sUnits ? K8S_UNITS[l] : UNITS[l]}`
}

/**
 * 将值和单位转换为字节数的字符串表示
 * @param {string} value - 数值的字符串表示
 * @param {string} unit - 单位
 * @param {boolean} fromK8s - 是否从 K8s 单位转换
 * @returns {string} - 字节数的字符串表示
 */
export function getBytes(value: string, unit: string, fromK8s: boolean = false): string {
  return convertToBytes(value, unit, fromK8s).toString(10)
}

/**
 * 将值和单位转换为字节数
 * @param {string} value - 数值的字符串表示
 * @param {string} unit - 单位
 * @param {boolean} fromK8s - 是否从 K8s 单位转换
 * @returns {number} - 字节数
 */
function convertToBytes(value: string, unit: string, fromK8s: boolean = false): number {
  const vl: number = Number.parseFloat(value)
  const unitsTake = fromK8s ? K8S_UNITS : UNITS
  const powFactor = unitsTake.findIndex(element => element === unit)

  if (powFactor === -1) {
    return 0
  }

  return vl * 1024 ** powFactor
}
