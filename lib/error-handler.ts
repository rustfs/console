export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  originalError?: Error
}

const GENERIC_ERROR_MESSAGES = new Set(["error", "unknown", "unknownerror"])

const normalizeErrorText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const isSpecificErrorText = (value: string | null): value is string => {
  return !!value && !GENERIC_ERROR_MESSAGES.has(value.toLowerCase())
}

const getXmlTagText = (xml: string, tagName: string): string | null => {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"))
  return normalizeErrorText(match?.[1])
}

export const getXmlErrorMessage = (xml: string): string | null => {
  const trimmed = xml.trim()
  if (!trimmed.startsWith("<")) {
    return null
  }

  const code = getXmlTagText(trimmed, "Code")
  if (isSpecificErrorText(code)) {
    return code
  }

  const message = getXmlTagText(trimmed, "Message") ?? getXmlTagText(trimmed, "Error")
  if (isSpecificErrorText(message)) {
    return message
  }

  return code ?? message
}

export const getServiceErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    const directMessage = normalizeErrorText(error.message)
    if (isSpecificErrorText(directMessage)) {
      return directMessage
    }
  }

  if (!error || typeof error !== "object") {
    return null
  }

  const err = error as {
    Code?: unknown
    Message?: unknown
    name?: unknown
    message?: unknown
    Error?: {
      Code?: unknown
      Message?: unknown
      message?: unknown
    }
  }

  const codeCandidates = [
    normalizeErrorText(err.Code),
    normalizeErrorText(err.Error?.Code),
    normalizeErrorText(err.name),
  ]
  const messageCandidates = [
    normalizeErrorText(err.Message),
    normalizeErrorText(err.Error?.Message),
    normalizeErrorText(err.Error?.message),
    normalizeErrorText(err.message),
  ]

  for (const candidate of codeCandidates) {
    if (isSpecificErrorText(candidate)) {
      return candidate
    }
  }

  for (const candidate of messageCandidates) {
    if (isSpecificErrorText(candidate)) {
      return candidate
    }
  }

  return codeCandidates.find(Boolean) ?? messageCandidates.find(Boolean) ?? null
}

export class ConfigLoadError extends Error {
  code: "INVALID_URL" | "STORAGE_ERROR" | "NETWORK_ERROR" | "UNKNOWN_ERROR"
  originalError?: Error

  constructor(message: string, code: ConfigLoadError["code"] = "UNKNOWN_ERROR", originalError?: Error) {
    super(message)
    this.name = "ConfigLoadError"
    this.code = code
    this.originalError = originalError
  }
}

export const parseApiError = async (response: Response): Promise<string> => {
  try {
    const errorData = await response.clone().json()
    return (errorData as { message?: string }).message || JSON.stringify(errorData) || response.statusText
  } catch {
    try {
      const text = await response.clone().text()
      if (text) {
        if (text.trim().startsWith("<")) {
          return getXmlErrorMessage(text) ?? text
        }
        return text
      }
    } catch {
      // keep statusText
    }
  }
  return response.statusText
}

export const handleConfigError = (error: unknown, context: string): ConfigLoadError => {
  if (error instanceof ConfigLoadError) {
    return error
  }

  if (error instanceof Error) {
    if (error.message.includes("Invalid URL")) {
      return new ConfigLoadError(`Invalid URL in ${context}: ${error.message}`, "INVALID_URL", error)
    }
    if (error.message.includes("localStorage") || error.message.includes("storage")) {
      return new ConfigLoadError(`Storage error in ${context}: ${error.message}`, "STORAGE_ERROR", error)
    }
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return new ConfigLoadError(`Network error in ${context}: ${error.message}`, "NETWORK_ERROR", error)
    }
  }

  return new ConfigLoadError(
    `Unknown error in ${context}: ${error}`,
    "UNKNOWN_ERROR",
    error instanceof Error ? error : new Error(String(error)),
  )
}
