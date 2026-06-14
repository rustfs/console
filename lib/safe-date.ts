export function normalizeDateToIso(value: Date | string | undefined | null): string {
  if (!value) return ""

  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()

  if (Number.isNaN(time)) {
    return ""
  }

  return date.toISOString()
}
