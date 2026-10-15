export function normalizeDateToIso(value: Date | string | undefined | null): string {
  if (!value) return ""

  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()

  if (Number.isNaN(time)) {
    return ""
  }

  return date.toISOString()
}

export function parseTimestampMilliseconds(value: unknown): Date | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined
  if (typeof value === "string" && !value.trim()) return undefined

  const date = new Date(Number(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}
