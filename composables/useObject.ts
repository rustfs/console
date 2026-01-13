import {
  DeleteObjectCommand,
  DeleteObjectTaggingCommand,
  GetObjectCommand,
  GetObjectLegalHoldCommand,
  GetObjectRetentionCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  ObjectLockRetentionMode,
  PutObjectCommand,
  PutObjectLegalHoldCommand,
  PutObjectRetentionCommand,
  PutObjectTaggingCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl as _getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { HttpRequest } from '@smithy/protocol-http'

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

  const attachForceDeleteHeader = (command: DeleteObjectCommand) => {
    command.middlewareStack.add(
      next => async args => {
        const request = args.request as HttpRequest
        request.headers['X-Rustfs-Force-Delete'] = 'true'
        return next(args)
      },
      { step: 'build', name: 'forceDeleteMiddleware', tags: ['FORCE_DELETE'] }
    )
  }

  const deleteObject = async (key: string, versionId?: string, options?: { forceDelete?: boolean }) => {
    const params: {
      Bucket: string
      Key: string
      VersionId?: string
    } = {
      Bucket: bucket,
      Key: key,
    }

    if (versionId) {
      params.VersionId = versionId
    }

    const command = new DeleteObjectCommand(params)
    if (options?.forceDelete) attachForceDeleteHeader(command)

    return await $client.send(command)
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

  async function listObjectVersions(key: string) {
    const params = {
      Bucket: bucket,
      Prefix: key, // match "abc" and "abcd"
      Delimiter: '/', // has no effect on "abcd", can keep or remove
    }

    const res = await $client.send(new ListObjectVersionsCommand(params))

    const Versions = (res.Versions ?? []).filter(v => v.Key === key)
    const DeleteMarkers = (res.DeleteMarkers ?? []).filter(m => m.Key === key)

    // Sort by LastModified desc
    Versions.sort((a, b) => +new Date(b.LastModified!) - +new Date(a.LastModified!))
    DeleteMarkers.sort((a, b) => +new Date(b.LastModified!) - +new Date(a.LastModified!))

    return { ...res, Versions, DeleteMarkers }
  }

  async function deleteAllVersions(key: string) {
    try {
      await deleteObject(key, undefined, { forceDelete: true })
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
    listObjectVersions,
    deleteAllVersions,
  }
}
