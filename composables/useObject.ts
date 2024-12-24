import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as _getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function useObject({ bucket, region }: { bucket: string, region?: string }) {
  const $client = useNuxtApp().$s3Client

  const headObject = async (key: string) => {
    const params = {
      Bucket: bucket,
      Key: key
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
      Body: body
    }

    return await $client.send(new PutObjectCommand(params))
  }

  const deleteObject = async (key: string) => {
    const params = {
      Bucket: bucket,
      Key: key
    }

    return await $client.send(new DeleteObjectCommand(params))
  }

  return { headObject, putObject, deleteObject, getSignedUrl }
}
