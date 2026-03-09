const FALLBACK_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"

function createSecureSuffix(length = 12): string {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure random generator is not available")
  }

  const chars: string[] = []
  const alphabetLength = FALLBACK_ALPHABET.length
  const maxByte = 256 - (256 % alphabetLength)

  while (chars.length < length) {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(length))
    for (const byte of bytes) {
      if (byte >= maxByte) continue
      chars.push(FALLBACK_ALPHABET[byte % alphabetLength] ?? "")
      if (chars.length === length) break
    }
  }

  return chars.join("")
}

export function createTaskId(seed: string): string {
  const prefix = Date.now()
  const cryptoApi = globalThis.crypto

  if (cryptoApi?.randomUUID) {
    return `${prefix}-${cryptoApi.randomUUID()}-${seed}`
  }

  return `${prefix}-${createSecureSuffix()}-${seed}`
}

