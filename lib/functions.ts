const UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
const K8S_UNITS = ["B", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi", "Yi"]

export function niceBytes(x: string, isK8sUnits = false): string {
  const n = Number.parseInt(x, 10) || 0
  return formatBytes(n, isK8sUnits)
}

export function formatBytes(n: number, isK8sUnits = false): string {
  const l = Math.floor(Math.log(n) / Math.log(1024)) || 0

  if (l < 0) {
    return "0 B"
  }
  const value = n / 1024 ** l
  return `${value.toFixed(1)} ${isK8sUnits ? K8S_UNITS[l] : UNITS[l]}`
}

export function getBytes(value: string, unit: string, fromK8s = false): string {
  return convertToBytes(value, unit, fromK8s).toString(10)
}

function convertToBytes(value: string, unit: string, fromK8s = false): number {
  const vl = Number.parseFloat(value)
  const unitsTake = fromK8s ? K8S_UNITS : UNITS
  const powFactor = unitsTake.findIndex((element) => element === unit)

  if (powFactor === -1) {
    return 0
  }

  return vl * 1024 ** powFactor
}

export function makeRandomString(length = 20): string {
  let initstr = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
  const arr = initstr.split("")

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = arr[i]
    const swapWith = arr[j]
    if (current !== undefined && swapWith !== undefined) {
      arr[i] = swapWith
      arr[j] = current
    }
  }

  initstr = arr.join("")
  return initstr.slice(0, length)
}
