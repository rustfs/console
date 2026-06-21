type S3KeyedItem = {
  Key?: string
}

type S3PrefixedItem = {
  Prefix?: string
}

type S3ObjectListResponse = {
  EncodingType?: string
  Prefix?: string
  Delimiter?: string
  StartAfter?: string
  Contents?: S3KeyedItem[]
  CommonPrefixes?: S3PrefixedItem[]
}

type S3ObjectVersionsResponse = {
  EncodingType?: string
  Prefix?: string
  Delimiter?: string
  KeyMarker?: string
  NextKeyMarker?: string
  Versions?: S3KeyedItem[]
  DeleteMarkers?: S3KeyedItem[]
  CommonPrefixes?: S3PrefixedItem[]
}

function decodeS3UrlValue(value: string | undefined): string | undefined {
  if (value == null) return value

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function decodeS3UrlEncodedObjectList<T extends S3ObjectListResponse>(response: T): T {
  if (response.EncodingType !== "url") return response

  response.Prefix = decodeS3UrlValue(response.Prefix)
  response.Delimiter = decodeS3UrlValue(response.Delimiter)
  response.StartAfter = decodeS3UrlValue(response.StartAfter)
  response.Contents?.forEach((item) => {
    item.Key = decodeS3UrlValue(item.Key)
  })
  response.CommonPrefixes?.forEach((item) => {
    item.Prefix = decodeS3UrlValue(item.Prefix)
  })

  return response
}

export function decodeS3UrlEncodedObjectVersions<T extends S3ObjectVersionsResponse>(response: T): T {
  if (response.EncodingType !== "url") return response

  response.Prefix = decodeS3UrlValue(response.Prefix)
  response.Delimiter = decodeS3UrlValue(response.Delimiter)
  response.KeyMarker = decodeS3UrlValue(response.KeyMarker)
  response.NextKeyMarker = decodeS3UrlValue(response.NextKeyMarker)
  response.Versions?.forEach((item) => {
    item.Key = decodeS3UrlValue(item.Key)
  })
  response.DeleteMarkers?.forEach((item) => {
    item.Key = decodeS3UrlValue(item.Key)
  })
  response.CommonPrefixes?.forEach((item) => {
    item.Prefix = decodeS3UrlValue(item.Prefix)
  })

  return response
}
