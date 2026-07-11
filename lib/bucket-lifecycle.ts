export interface LifecycleFilterTag {
  key: string
  value: string
}

export function buildLifecycleFilter(prefix: string, tags: LifecycleFilterTag[]): Record<string, unknown> {
  const validTags = tags.filter((tag) => tag.key && tag.value)
  if (!prefix && validTags.length === 0) return { Prefix: "" }

  const [firstTag] = validTags
  if (firstTag && validTags.length === 1 && !prefix) {
    return { Tag: { Key: firstTag.key, Value: firstTag.value } }
  }

  if (validTags.length > 0) {
    return {
      And: {
        Tags: validTags.map((tag) => ({ Key: tag.key, Value: tag.value })),
        ...(prefix ? { Prefix: prefix } : {}),
      },
    }
  }

  return { Prefix: prefix }
}

export function buildCurrentVersionExpiration(days: number, expiredDeleteMarker: boolean): Record<string, unknown> {
  return expiredDeleteMarker ? { ExpiredObjectDeleteMarker: true } : { Days: days }
}
