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

export function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  // Fallback to crypto.getRandomValues if available
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) => {
      const n = Number.parseInt(c, 10)
      return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16)
    })
  }

  // Last resort fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
