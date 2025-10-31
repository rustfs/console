// Define units
const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
const K8S_UNITS = ['B', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi']

/**
 * Convert byte count to human-readable format
 * @param {string} x - String representation of byte count
 * @param {boolean} isK8sUnits - Whether to use K8s units
 * @returns {string} - Human-readable byte count
 */
export function niceBytes(x: string, isK8sUnits: boolean = false): string {
  const n = Number.parseInt(x, 10) || 0
  return formatBytes(n, isK8sUnits)
}

/**
 * Convert integer byte count to human-readable format
 * @param {number} n - Byte count
 * @param {boolean} isK8sUnits - Whether to use K8s units
 * @returns {string} - Human-readable byte count
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
 * Convert value and unit to string representation of byte count
 * @param {string} value - String representation of value
 * @param {string} unit - Unit
 * @param {boolean} fromK8s - Whether converting from K8s units
 * @returns {string} - String representation of byte count
 */
export function getBytes(value: string, unit: string, fromK8s: boolean = false): string {
  return convertToBytes(value, unit, fromK8s).toString(10)
}

/**
 * Convert value and unit to byte count
 * @param {string} value - String representation of value
 * @param {string} unit - Unit
 * @param {boolean} fromK8s - Whether converting from K8s units
 * @returns {number} - Byte count
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

/**
 * Generate random string of specified length
 * @param length - Length of the string to generate
 * @returns Random string
 */
export function makeRandomString(length = 20): string {
  let initstr = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
  // Convert string to array
  const arr = initstr.split('')

  // Shuffle array
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = arr[i]
    const swapWith = arr[j]
    if (current !== undefined && swapWith !== undefined) {
      arr[i] = swapWith
      arr[j] = current
    }
  }

  // Convert array back to string
  initstr = arr.join('')

  return initstr.slice(0, length)
}
