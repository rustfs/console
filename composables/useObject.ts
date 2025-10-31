import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectTaggingCommand,
  PutObjectTaggingCommand,
  DeleteObjectTaggingCommand,
  GetObjectRetentionCommand,
  PutObjectRetentionCommand,
  GetObjectLegalHoldCommand,
  PutObjectLegalHoldCommand,
  ListObjectVersionsCommand,
  ObjectLockRetentionMode,
} from '@aws-sdk/client-s3'
import { getSignedUrl as _getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function useObject({ bucket, region }: { bucket: string; region?: string }) {
  const $client = useNuxtApp().$s3Client

  const headObject = async (key: string) => {
    const params = {
      Bucket: bucket,
      Key: key,
    }

    return await $client.send(new HeadObjectCommand(params))
  }

  const getSignedUrl = async (key: string, expiresIn = 3600) => {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    return await _getSignedUrl($client, command, { expiresIn })
  }

  const putObject = async (key: string, body: Blob | string) => {
    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
    }

    return await $client.send(new PutObjectCommand(params))
  }

  const deleteObject = async (key: string, versionId?: string) => {
    const params: {
      Bucket: string
      Key: string
      VersionId?: string
    } = {
      Bucket: bucket,
      Key: key,
    }

    // If version ID exists and is not null version ID, pass the version ID
    if (versionId) {
      params.VersionId = versionId
    }

    return await $client.send(new DeleteObjectCommand(params))
  }

  const listObject = async (bucket: string, prefix: string | undefined = undefined, pageSize: number = 25) => {
    const params = {
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: pageSize,
      Delimiter: '/',
    }

    return await $client.send(new ListObjectsV2Command(params))
  }

  async function mapAllFiles(bucketName: string, prefix: string, callback: (fileKey: string) => void) {
    let isTruncated = true
    let continuationToken: string | undefined = undefined

    while (isTruncated) {
      const params: {
        Bucket: string
        Prefix: string
        ContinuationToken?: string
      } = {
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }

      try {
        const data = await $client.send(new ListObjectsV2Command(params))
        data.Contents?.forEach(item => {
          if (item.Key) {
            callback(item.Key)
          }
        })

        isTruncated = data.IsTruncated || false
        continuationToken = data.NextContinuationToken
      } catch (error) {
        console.error('Error listing files: ', error)
        throw error
      }
    }
  }

  async function getObjectInfo(key: string) {
    const [meta, signedUrl] = await Promise.all([headObject(key), getSignedUrl(key)])
    return {
      ...meta,
      Key: key,
      SignedUrl: signedUrl,
    }
  }

  async function getObjectTags(key: string): Promise<Array<{ Key: string; Value: string }>> {
    const params = {
      Bucket: bucket,
      Key: key,
    }

    const response = await $client.send(new GetObjectTaggingCommand(params))
    return (response.TagSet ?? []).map(tag => ({
      Key: tag.Key ?? '',
      Value: tag.Value ?? '',
    }))
  }

  async function putObjectTags(key: string, tags: Array<{ Key: string; Value: string }>) {
    const sanitizedTags = tags.filter(tag => tag.Key && tag.Value).map(tag => ({ Key: tag.Key, Value: tag.Value }))

    const params = {
      Bucket: bucket,
      Key: key,
      Tagging: {
        TagSet: sanitizedTags,
      },
    }

    return await $client.send(new PutObjectTaggingCommand(params))
  }

  async function deleteObjectTags(key: string) {
    const params = {
      Bucket: bucket,
      Key: key,
    }

    return await $client.send(new DeleteObjectTaggingCommand(params))
  }

  async function getObjectRetention(key: string) {
    const params = {
      Bucket: bucket,
      Key: key,
    }

    try {
      const response = await $client.send(new GetObjectRetentionCommand(params))
      const retention = response?.Retention
      if (!retention || Object.keys(retention).length === 0) {
        return { Mode: '', RetainUntilDate: '' }
      }
      return {
        Mode: retention.Mode ?? '',
        RetainUntilDate: retention.RetainUntilDate ? new Date(retention.RetainUntilDate).toISOString() : '',
      }
    } catch (error: any) {
      if (error.message?.includes('Deserialization error')) {
        return { Mode: '', RetainUntilDate: '' }
      }
      throw error
    }
  }

  async function putObjectRetention(
    key: string,
    retention: { Mode: 'GOVERNANCE' | 'COMPLIANCE'; RetainUntilDate?: string }
  ) {
    const params = {
      Bucket: bucket,
      Key: key,
      Retention: {
        Mode: retention.Mode === 'COMPLIANCE' ? ObjectLockRetentionMode.COMPLIANCE : ObjectLockRetentionMode.GOVERNANCE,
        ...(retention.RetainUntilDate ? { RetainUntilDate: new Date(retention.RetainUntilDate) } : {}),
      },
    }
    return await $client.send(new PutObjectRetentionCommand(params))
  }

  async function getObjectLegalHold(key: string) {
    const params = {
      Bucket: bucket,
      Key: key,
    }

    return await $client.send(new GetObjectLegalHoldCommand(params))
  }

  async function putObjectLegalHold(key: string, legalHold: any) {
    const params = {
      Bucket: bucket,
      Key: key,
      LegalHold: legalHold,
    }

    return await $client.send(new PutObjectLegalHoldCommand(params))
  }

  async function getObjectVersions(key: string) {
    const params = {
      Bucket: bucket,
      Prefix: key,
    }

    return await $client.send(new ListObjectVersionsCommand(params))
  }

  async function deleteAllVersions(key: string) {
    try {
      // Get all versions of the object
      const versions = await getObjectVersions(key)
      const versionsToDelete = versions.Versions || []
      const deleteMarkers = versions.DeleteMarkers || []

      // Delete all versions
      const deletePromises = versionsToDelete.map(version => deleteObject(key, version.VersionId))

      // Delete all delete markers
      const deleteMarkerPromises = deleteMarkers.map(marker => deleteObject(key, marker.VersionId))

      await Promise.all([...deletePromises, ...deleteMarkerPromises])

      return { success: true }
    } catch (error) {
      console.error('Error deleting all versions:', error)
      throw error
    }
  }

  return {
    headObject,
    putObject,
    deleteObject,
    getSignedUrl,
    getObjectInfo,
    mapAllFiles,
    listObject,
    getObjectTags,
    putObjectTags,
    deleteObjectTags,
    getObjectRetention,
    putObjectRetention,
    getObjectLegalHold,
    putObjectLegalHold,
    setLegalHold: (key: string, enabled: boolean) => putObjectLegalHold(key, { Status: enabled ? 'ON' : 'OFF' }),
    getObjectVersions,
    deleteAllVersions,
  }
}
