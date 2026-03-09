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
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
  if (length <= 0) return ""

  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure random generator is not available")
  }

  const result: string[] = []
  const alphabetLength = alphabet.length
  const maxByte = 256 - (256 % alphabetLength)

  while (result.length < length) {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(length))
    for (const byte of bytes) {
      if (byte >= maxByte) continue
      result.push(alphabet[byte % alphabetLength] ?? "")
      if (result.length === length) break
    }
  }

  return result.join("")
}
