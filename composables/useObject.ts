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
} from '@aws-sdk/client-s3';
import { getSignedUrl as _getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function useObject({ bucket, region }: { bucket: string; region?: string }) {
  const $client = useNuxtApp().$s3Client;

  const headObject = async (key: string) => {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    return await $client.send(new HeadObjectCommand(params));
  };

  const getSignedUrl = async (key: string, expiresIn = 3600) => {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await _getSignedUrl($client, command, { expiresIn });
  };

  const putObject = async (key: string, body: Blob | string) => {
    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
    };

    return await $client.send(new PutObjectCommand(params));
  };

  const deleteObject = async (key: string, versionId?: string) => {
    const params: {
      Bucket: string;
      Key: string;
      VersionId?: string;
    } = {
      Bucket: bucket,
      Key: key,
    };

    // 如果版本ID存在且不是null版本ID，则传递版本ID
    if (versionId) {
      params.VersionId = versionId;
    }

    return await $client.send(new DeleteObjectCommand(params));
  };

  const listObject = async (bucket: string, prefix: string | undefined = undefined, pageSize: number = 25) => {
    const params = {
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: pageSize,
      Delimiter: '/',
    };

    return await $client.send(new ListObjectsV2Command(params));
  };

  async function mapAllFiles(bucketName: string, prefix: string, callback: (fileKey: string) => void) {
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const params: {
        Bucket: string;
        Prefix: string;
        ContinuationToken?: string;
      } = {
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      };

      try {
        const data = await $client.send(new ListObjectsV2Command(params));
        data.Contents?.forEach(item => {
          if (item.Key) {
            callback(item.Key);
          }
        });

        isTruncated = data.IsTruncated || false;
        continuationToken = data.NextContinuationToken;
      } catch (error) {
        console.error('Error listing files: ', error);
        throw error;
      }
    }
  }

  async function getObjectTagging(key: string) {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    return await $client.send(new GetObjectTaggingCommand(params));
  }

  async function putObjectTagging(key: string, tagging: any) {
    const params = {
      Bucket: bucket,
      Key: key,
      Tagging: tagging,
    };

    return await $client.send(new PutObjectTaggingCommand(params));
  }

  async function deleteObjectTagging(key: string) {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    return await $client.send(new DeleteObjectTaggingCommand(params));
  }

  async function getObjectRetention(key: string) {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    try {
      const response = await $client.send(new GetObjectRetentionCommand(params));
      if (!response || !response.Retention || Object.keys(response.Retention).length === 0) {
        return { Retention: null };
      }
      return response;
    } catch (error: any) {
      if (error.message?.includes('Deserialization error')) {
        return { Retention: null };
      }
      throw error;
    }
  }

  async function putObjectRetention(key: string, retention: any) {
    const params = {
      Bucket: bucket,
      Key: key,
      Retention: retention,
    };
    return await $client.send(new PutObjectRetentionCommand(params));
  }

  async function getObjectLegalHold(key: string) {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    return await $client.send(new GetObjectLegalHoldCommand(params));
  }

  async function putObjectLegalHold(key: string, legalHold: any) {
    const params = {
      Bucket: bucket,
      Key: key,
      LegalHold: legalHold,
    };

    return await $client.send(new PutObjectLegalHoldCommand(params));
  }

  async function getObjectVersions(key: string) {
    const params = {
      Bucket: bucket,
      Prefix: key,
    };

    return await $client.send(new ListObjectVersionsCommand(params));
  }

  async function deleteAllVersions(key: string) {
    try {
      // 获取对象的所有版本
      const versions = await getObjectVersions(key);
      const versionsToDelete = versions.Versions || [];
      const deleteMarkers = versions.DeleteMarkers || [];

      // 删除所有版本
      const deletePromises = versionsToDelete.map(version => deleteObject(key, version.VersionId));

      // 删除所有删除标记
      const deleteMarkerPromises = deleteMarkers.map(marker => deleteObject(key, marker.VersionId));

      await Promise.all([...deletePromises, ...deleteMarkerPromises]);

      return { success: true };
    } catch (error) {
      console.error('Error deleting all versions:', error);
      throw error;
    }
  }

  return {
    headObject,
    putObject,
    deleteObject,
    getSignedUrl,
    mapAllFiles,
    listObject,
    getObjectTagging,
    putObjectTagging,
    deleteObjectTagging,
    getObjectRetention,
    putObjectRetention,
    getObjectLegalHold,
    putObjectLegalHold,
    getObjectVersions,
    deleteAllVersions,
  };
}
