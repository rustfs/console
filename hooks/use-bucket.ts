"use client";

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
} from "@aws-sdk/client-s3";
import { useS3 } from "@/contexts/s3-context";
import { useApi } from "@/contexts/api-context";

export function useBucket() {
  const client = useS3();
  const api = useApi();

  const listBuckets = async () => {
    return client.send(new ListBucketsCommand({}));
  };

  const createBucket = async (params: {
    Bucket: string;
    ObjectLockEnabledForBucket?: boolean;
  }) => {
    return client.send(new CreateBucketCommand(params));
  };

  const headBucket = async (bucket: string) => {
    return client.send(new HeadBucketCommand({ Bucket: bucket }));
  };

  const deleteBucket = async (bucket: string) => {
    return client.send(new DeleteBucketCommand({ Bucket: bucket }));
  };

  const getBucketTagging = async (bucket: string) => {
    return client.send(new GetBucketTaggingCommand({ Bucket: bucket }));
  };

  const putBucketTagging = async (bucket: string, tagging: unknown) => {
    return client.send(
      new PutBucketTaggingCommand({
        Bucket: bucket,
        Tagging: tagging as never,
      }),
    );
  };

  const deleteBucketTagging = async (bucket: string) => {
    return client.send(new DeleteBucketTaggingCommand({ Bucket: bucket }));
  };

  const putBucketVersioning = async (bucket: string, status: string) => {
    return client.send(
      new PutBucketVersioningCommand({
        Bucket: bucket,
        VersioningConfiguration: {
          Status:
            status === "Enabled"
              ? BucketVersioningStatus.Enabled
              : BucketVersioningStatus.Suspended,
          MFADelete: MFADelete.Enabled,
        },
      }),
    );
  };

  const getBucketVersioning = async (bucket: string) => {
    return client.send(new GetBucketVersioningCommand({ Bucket: bucket }));
  };

  const getBucketPolicy = async (bucket: string) => {
    return client.send(new GetBucketPolicyCommand({ Bucket: bucket }));
  };

  const getBucketPolicyStatus = async (bucket: string) => {
    return client.send(new GetBucketPolicyStatusCommand({ Bucket: bucket }));
  };

  const putBucketPolicy = async (bucket: string, policy: string) => {
    return client.send(
      new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }),
    );
  };

  const getObjectLockConfiguration = async (bucket: string) => {
    return client.send(
      new GetObjectLockConfigurationCommand({ Bucket: bucket }),
    );
  };

  const putObjectLockConfiguration = async (
    bucket: string,
    objectLockConfiguration: unknown,
  ) => {
    return client.send(
      new PutObjectLockConfigurationCommand({
        Bucket: bucket,
        ObjectLockConfiguration: objectLockConfiguration as never,
      }),
    );
  };

  const getBucketLifecycleConfiguration = async (bucket: string) => {
    return client.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }),
    );
  };

  const putBucketLifecycleConfiguration = async (
    bucket: string,
    lifecycleConfiguration: unknown,
  ) => {
    return client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: lifecycleConfiguration as never,
      }),
    );
  };

  const deleteBucketLifecycle = async (bucket: string) => {
    return client.send(new DeleteBucketLifecycleCommand({ Bucket: bucket }));
  };

  const putObjectRetention = async (
    bucket: string,
    key: string,
    retention: unknown,
  ) => {
    return client.send(
      new PutObjectRetentionCommand({
        Bucket: bucket,
        Key: key,
        Retention: retention as never,
      }),
    );
  };

  const getObjectRetention = async (bucket: string, key: string) => {
    return client.send(
      new GetObjectRetentionCommand({ Bucket: bucket, Key: key }),
    );
  };

  const getBucketEncryption = async (bucket: string) => {
    return client.send(new GetBucketEncryptionCommand({ Bucket: bucket }));
  };

  const putBucketEncryption = async (bucket: string, encryption: unknown) => {
    return client.send(
      new PutBucketEncryptionCommand({
        Bucket: bucket,
        ServerSideEncryptionConfiguration: encryption as never,
      }),
    );
  };

  const deleteBucketEncryption = async (bucket: string) => {
    return client.send(new DeleteBucketEncryptionCommand({ Bucket: bucket }));
  };

  const getBucketReplication = async (bucket: string) => {
    return client.send(new GetBucketReplicationCommand({ Bucket: bucket }));
  };

  const putBucketReplication = async (bucket: string, replication: unknown) => {
    return client.send(
      new PutBucketReplicationCommand({
        Bucket: bucket,
        ReplicationConfiguration: replication as never,
      }),
    );
  };

  const deleteBucketReplication = async (bucket: string) => {
    return client.send(new DeleteBucketReplicationCommand({ Bucket: bucket }));
  };

  const deleteRemoteReplicationTarget = async (bucket: string, arn: string) => {
    return api.delete(
      `/remove-remote-target?bucket=${bucket}&arn=${encodeURIComponent(arn)}`,
    );
  };

  const setRemoteReplicationTarget = async (bucket: string, data: unknown) => {
    return api.put(
      `/set-remote-target?bucket=${encodeURIComponent(bucket)}`,
      data,
    );
  };

  const listBucketNotifications = async (bucket: string) => {
    return client.send(
      new GetBucketNotificationConfigurationCommand({ Bucket: bucket }),
    );
  };

  const putBucketNotifications = async (bucket: string, data: unknown) => {
    return client.send(
      new PutBucketNotificationConfigurationCommand({
        Bucket: bucket,
        NotificationConfiguration: data as never,
      }),
    );
  };

  const getBucketQuota = async (bucket: string) => api.get(`/quota/${bucket}`);
  const putBucketQuota = async (bucket: string, quota: unknown) =>
    api.put(`/quota/${bucket}`, quota);
  const deleteBucketQuota = async (bucket: string) =>
    api.delete(`/quota/${bucket}`);
  const getBucketQuotaUsage = async (bucket: string) =>
    api.get(`/quota-stats/${bucket}`);
  const checkBucketQuota = async (bucket: string) =>
    api.get(`/quota-check/${bucket}`);

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
  };
}
