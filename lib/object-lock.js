import dayjs from "dayjs"

export function isObjectLegalHoldEnabled(value) {
  if (typeof value === "string") return value === "ON"

  return value?.Status === "ON" || value?.LegalHold?.Status === "ON" || value?.ObjectLockLegalHoldStatus === "ON"
}

export function toObjectRetentionInputValue(value) {
  return value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DDTHH:mm") : ""
}

export function toObjectRetentionRequestValue(value) {
  if (!value) return undefined

  const date = dayjs(value)
  return date.isValid() ? date.toISOString() : undefined
}

export function getDefaultObjectRetentionDate(now = new Date()) {
  return dayjs(now).add(1, "day").second(0).millisecond(0).toISOString()
}

export function getMinimumObjectRetentionDate(now = new Date()) {
  return dayjs(now).add(1, "minute").second(0).millisecond(0).toISOString()
}

export function isObjectRetentionDateInFuture(value, now = new Date()) {
  const date = dayjs(value)
  return date.isValid() && date.isAfter(dayjs(now))
}

export function shouldShowObjectRetentionAction({ canEditRetention, legalHoldEnabled }) {
  return Boolean(canEditRetention && legalHoldEnabled)
}
