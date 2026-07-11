const SENSITIVE_LOG_KEY =
  /(?:token|secret|password|authorization|cookie|credential|creds|api[_-]?key|master[_-]?key|private[_-]?key)/i

function redactLogValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_LOG_KEY.test(key)) return "[REDACTED]"
  if (Array.isArray(value)) return value.map((item) => redactLogValue(item))
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
      entryKey,
      redactLogValue(entryValue, entryKey),
    ]),
  )
}

export function redactRequestOptionsForLog<T extends object>(options: T): unknown {
  const request = options as T & { body?: unknown }
  let body = request.body
  if (typeof body === "string") {
    try {
      const parsedBody = JSON.parse(body) as unknown
      body = parsedBody && typeof parsedBody === "object" ? JSON.stringify(redactLogValue(parsedBody)) : "[REDACTED]"
    } catch {
      body = "[REDACTED]"
    }
  } else if (body && typeof body === "object") {
    body = redactLogValue(body)
  }

  return redactLogValue({ ...options, body })
}
