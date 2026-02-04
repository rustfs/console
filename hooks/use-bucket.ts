"use client"

import { useCallback } from "react"
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketPolicyCommand,
  GetBucketPolicyStatusCommand,
  GetBucketReplicationCommand,
  GetBucketTaggingCommand,
  GetBucketVersioningCommand,
  GetObjectLockConfigurationCommand,
  GetObjectRetentionCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  PutBucketEncryptionCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
  PutBucketReplicationCommand,
  PutBucketTaggingCommand,
  PutBucketVersioningCommand,
  PutObjectLockConfigurationCommand,
  PutObjectRetentionCommand,
  DeleteBucketTaggingCommand,
  DeleteBucketEncryptionCommand,
  DeleteBucketLifecycleCommand,
  DeleteBucketReplicationCommand,
  PutBucketNotificationConfigurationCommand,
  GetBucketNotificationConfigurationCommand,
  MFADelete,
  BucketVersioningStatus,
} from "@aws-sdk/client-s3"
import { useS3 } from "@/contexts/s3-context"
import { useApi } from "@/contexts/api-context"

export function useBucket() {
  const client = useS3()
  const api = useApi()

  const listBuckets = useCallback(async () => {
    return client.send(new ListBucketsCommand({}))
  }, [client])

  const createBucket = useCallback(
    async (params: { Bucket: string; ObjectLockEnabledForBucket?: boolean }) => {
      return client.send(new CreateBucketCommand(params))
    },
    [client],
  )

  const headBucket = useCallback(
    async (bucket: string) => {
      return client.send(new HeadBucketCommand({ Bucket: bucket }))
    },
    [client],
  )

  const deleteBucket = useCallback(
    async (bucket: string) => {
      return client.send(new DeleteBucketCommand({ Bucket: bucket }))
    },
    [client],
  )

  const getBucketTagging = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketTaggingCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putBucketTagging = useCallback(
    async (bucket: string, tagging: unknown) => {
      return client.send(
        new PutBucketTaggingCommand({
          Bucket: bucket,
          Tagging: tagging as never,
        }),
      )
    },
    [client],
  )

  const deleteBucketTagging = useCallback(
    async (bucket: string) => {
      return client.send(new DeleteBucketTaggingCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putBucketVersioning = useCallback(
    async (bucket: string, status: string) => {
      return client.send(
        new PutBucketVersioningCommand({
          Bucket: bucket,
          VersioningConfiguration: {
            Status: status === "Enabled" ? BucketVersioningStatus.Enabled : BucketVersioningStatus.Suspended,
            MFADelete: MFADelete.Enabled,
          },
        }),
      )
    },
    [client],
  )

  const getBucketVersioning = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketVersioningCommand({ Bucket: bucket }))
    },
    [client],
  )

  const getBucketPolicy = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketPolicyCommand({ Bucket: bucket }))
    },
    [client],
  )

  const getBucketPolicyStatus = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketPolicyStatusCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putBucketPolicy = useCallback(
    async (bucket: string, policy: string) => {
      return client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }))
    },
    [client],
  )

  const getObjectLockConfiguration = useCallback(
    async (bucket: string) => {
      return client.send(new GetObjectLockConfigurationCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putObjectLockConfiguration = useCallback(
    async (bucket: string, objectLockConfiguration: unknown) => {
      return client.send(
        new PutObjectLockConfigurationCommand({
          Bucket: bucket,
          ObjectLockConfiguration: objectLockConfiguration as never,
        }),
      )
    },
    [client],
  )

  const getBucketLifecycleConfiguration = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putBucketLifecycleConfiguration = useCallback(
    async (bucket: string, lifecycleConfiguration: unknown) => {
      return client.send(
        new PutBucketLifecycleConfigurationCommand({
          Bucket: bucket,
          LifecycleConfiguration: lifecycleConfiguration as never,
        }),
      )
    },
    [client],
  )

  const deleteBucketLifecycle = useCallback(
    async (bucket: string) => {
      return client.send(new DeleteBucketLifecycleCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putObjectRetention = useCallback(
    async (bucket: string, key: string, retention: unknown) => {
      return client.send(
        new PutObjectRetentionCommand({
          Bucket: bucket,
          Key: key,
          Retention: retention as never,
        }),
      )
    },
    [client],
  )

  const getObjectRetention = useCallback(
    async (bucket: string, key: string) => {
      return client.send(new GetObjectRetentionCommand({ Bucket: bucket, Key: key }))
    },
    [client],
  )

  const getBucketEncryption = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketEncryptionCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putBucketEncryption = useCallback(
    async (bucket: string, encryption: unknown) => {
      return client.send(
        new PutBucketEncryptionCommand({
          Bucket: bucket,
          ServerSideEncryptionConfiguration: encryption as never,
        }),
      )
    },
    [client],
  )

  const deleteBucketEncryption = useCallback(
    async (bucket: string) => {
      return client.send(new DeleteBucketEncryptionCommand({ Bucket: bucket }))
    },
    [client],
  )

  const getBucketReplication = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketReplicationCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putBucketReplication = useCallback(
    async (bucket: string, replication: unknown) => {
      return client.send(
        new PutBucketReplicationCommand({
          Bucket: bucket,
          ReplicationConfiguration: replication as never,
        }),
      )
    },
    [client],
  )

  const deleteBucketReplication = useCallback(
    async (bucket: string) => {
      return client.send(new DeleteBucketReplicationCommand({ Bucket: bucket }))
    },
    [client],
  )

  const deleteRemoteReplicationTarget = useCallback(
    async (bucket: string, arn: string) => {
      return api.delete(`/remove-remote-target?bucket=${bucket}&arn=${encodeURIComponent(arn)}`)
    },
    [api],
  )

  const setRemoteReplicationTarget = useCallback(
    async (bucket: string, data: unknown) => {
      return api.put(`/set-remote-target?bucket=${encodeURIComponent(bucket)}`, data)
    },
    [api],
  )

  const listBucketNotifications = useCallback(
    async (bucket: string) => {
      return client.send(new GetBucketNotificationConfigurationCommand({ Bucket: bucket }))
    },
    [client],
  )

  const putBucketNotifications = useCallback(
    async (bucket: string, data: unknown) => {
      return client.send(
        new PutBucketNotificationConfigurationCommand({
          Bucket: bucket,
          NotificationConfiguration: data as never,
        }),
      )
    },
    [client],
  )

  const getBucketQuota = useCallback(async (bucket: string) => api.get(`/quota/${bucket}`), [api])
  const putBucketQuota = useCallback(
    async (bucket: string, quota: unknown) => api.put(`/quota/${bucket}`, quota),
    [api],
  )
  const deleteBucketQuota = useCallback(async (bucket: string) => api.delete(`/quota/${bucket}`), [api])
  const getBucketQuotaUsage = useCallback(async (bucket: string) => api.get(`/quota-stats/${bucket}`), [api])
  const checkBucketQuota = useCallback(async (bucket: string) => api.get(`/quota-check/${bucket}`), [api])

  return {
    listBuckets,
    createBucket,
    headBucket,
    deleteBucket,
    getBucketTagging,
    putBucketTagging,
    deleteBucketTagging,
    putBucketVersioning,
    getBucketVersioning,
    getBucketPolicyStatus,
    getBucketPolicy,
    putBucketPolicy,
    getObjectLockConfiguration,
    putObjectLockConfiguration,
    getBucketLifecycleConfiguration,
    putBucketLifecycleConfiguration,
    deleteBucketLifecycle,
    putObjectRetention,
    getObjectRetention,
    getBucketEncryption,
    putBucketEncryption,
    deleteBucketEncryption,
    getBucketReplication,
    putBucketReplication,
    deleteBucketReplication,
    deleteRemoteReplicationTarget,
    setRemoteReplicationTarget,
    listBucketNotifications,
    putBucketNotifications,
    getBucketQuota,
    putBucketQuota,
    deleteBucketQuota,
    getBucketQuotaUsage,
    checkBucketQuota,
  }
}
