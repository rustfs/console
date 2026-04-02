import type { CORSRule } from "@aws-sdk/client-s3"

export interface BucketCorsConfiguration {
  CORSRules: CORSRule[]
}

interface BucketCorsValidationResult {
  config: BucketCorsConfiguration | null
  error: string | null
}

const ALLOWED_METHODS = new Set(["GET", "PUT", "POST", "DELETE", "HEAD"])
const RULE_KEYS = new Set([
  "ID",
  "AllowedHeaders",
  "AllowedMethods",
  "AllowedOrigins",
  "ExposeHeaders",
  "MaxAgeSeconds",
])

export const DEFAULT_BUCKET_CORS_CONFIGURATION: BucketCorsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
    },
  ],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseStringArray(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {},
): string[] | undefined {
  if (value == null) {
    if (options.required) {
      throw new Error(`${fieldName} is required`)
    }
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings`)
  }

  const normalized = value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`${fieldName}[${index}] must be a string`)
    }

    const trimmed = item.trim()
    if (!trimmed) {
      throw new Error(`${fieldName}[${index}] cannot be empty`)
    }

    return trimmed
  })

  if (options.required && normalized.length === 0) {
    throw new Error(`${fieldName} must contain at least one value`)
  }

  return normalized
}

function normalizeRule(rule: unknown, index: number): CORSRule {
  if (!isRecord(rule)) {
    throw new Error(`CORSRules[${index}] must be an object`)
  }

  for (const key of Object.keys(rule)) {
    if (!RULE_KEYS.has(key)) {
      throw new Error(`CORSRules[${index}] contains unsupported field "${key}"`)
    }
  }

  const allowedOrigins =
    parseStringArray(rule.AllowedOrigins, `CORSRules[${index}].AllowedOrigins`, { required: true }) ?? []
  const allowedMethods =
    parseStringArray(rule.AllowedMethods, `CORSRules[${index}].AllowedMethods`, { required: true }) ?? []

  for (const method of allowedMethods) {
    if (!ALLOWED_METHODS.has(method)) {
      throw new Error(
        `CORSRules[${index}].AllowedMethods contains invalid method "${method}". Allowed values: GET, PUT, POST, DELETE, HEAD`,
      )
    }
  }

  const allowedHeaders = parseStringArray(rule.AllowedHeaders, `CORSRules[${index}].AllowedHeaders`)
  const exposeHeaders = parseStringArray(rule.ExposeHeaders, `CORSRules[${index}].ExposeHeaders`)

  if (rule.ID != null && typeof rule.ID !== "string") {
    throw new Error(`CORSRules[${index}].ID must be a string`)
  }

  const id = typeof rule.ID === "string" ? rule.ID.trim() : undefined
  if (id && id.length > 255) {
    throw new Error(`CORSRules[${index}].ID cannot be longer than 255 characters`)
  }

  if (rule.MaxAgeSeconds != null) {
    if (typeof rule.MaxAgeSeconds !== "number" || !Number.isInteger(rule.MaxAgeSeconds) || rule.MaxAgeSeconds < 0) {
      throw new Error(`CORSRules[${index}].MaxAgeSeconds must be a non-negative integer`)
    }
  }

  return {
    ...(id ? { ID: id } : {}),
    ...(allowedHeaders ? { AllowedHeaders: allowedHeaders } : {}),
    AllowedMethods: allowedMethods,
    AllowedOrigins: allowedOrigins,
    ...(exposeHeaders ? { ExposeHeaders: exposeHeaders } : {}),
    ...(rule.MaxAgeSeconds != null ? { MaxAgeSeconds: rule.MaxAgeSeconds } : {}),
  }
}

export function normalizeBucketCorsConfig(value: unknown): BucketCorsConfiguration {
  const rawRules = Array.isArray(value) ? value : isRecord(value) ? value.CORSRules : undefined

  if (!rawRules) {
    throw new Error('CORS JSON must be an array of rules or an object with a "CORSRules" array')
  }

  if (!Array.isArray(rawRules)) {
    throw new Error("CORSRules must be an array")
  }

  if (rawRules.length === 0) {
    throw new Error("CORSRules must contain at least one rule")
  }

  return {
    CORSRules: rawRules.map((rule, index) => normalizeRule(rule, index)),
  }
}

export function validateBucketCorsJson(content: string): BucketCorsValidationResult {
  if (!content.trim()) {
    return {
      config: null,
      error: "CORS JSON cannot be empty",
    }
  }

  try {
    const parsed = JSON.parse(content) as unknown
    const config = normalizeBucketCorsConfig(parsed)
    return {
      config,
      error: null,
    }
  } catch (error) {
    return {
      config: null,
      error: error instanceof Error ? error.message : "Invalid CORS JSON",
    }
  }
}

export function stringifyBucketCorsConfig(config?: BucketCorsConfiguration | null): string {
  return JSON.stringify(config?.CORSRules ?? DEFAULT_BUCKET_CORS_CONFIGURATION.CORSRules, null, 2)
}
