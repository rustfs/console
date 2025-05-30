import {
  CreateBucketCommand,
  HeadBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
  GetBucketTaggingCommand,
  PutBucketTaggingCommand,
  DeleteBucketTaggingCommand,
  PutBucketVersioningCommand,
  GetBucketVersioningCommand,
  MFADelete,
  BucketVersioningStatus,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  GetBucketPolicyStatusCommand,
  GetObjectLockConfigurationCommand,
  PutObjectLockConfigurationCommand,
  PutObjectRetentionCommand,
  GetObjectRetentionCommand,
  // GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  DeleteBucketLifecycleCommand,
} from "@aws-sdk/client-s3";

export function useBucket({ region }: { region?: string }) {
  const $client = useNuxtApp().$s3Client;

  const listBuckets = async () => {
    return await $client.send(new ListBucketsCommand({}));
  };

  const createBucket = async (params: any) => {
    return await $client.send(new CreateBucketCommand(params));
  };

  const headBucket = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new HeadBucketCommand(params));
  };

  const deleteBucket = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new DeleteBucketCommand(params));
  };

  const getBucketTagging = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new GetBucketTaggingCommand(params));
  };

  const putBucketTagging = async (bucket: string, tagging: any) => {
    const params = {
      Bucket: bucket,
      Tagging: tagging,
    };

    return await $client.send(new PutBucketTaggingCommand(params));
  };

  const deleteBucketTagging = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new DeleteBucketTaggingCommand(params));
  };

  const putBucketVersioning = async (bucket: string, status: string) => {
    const params = {
      Bucket: bucket,
      VersioningConfiguration: {
        Status: status == "Enabled" ? BucketVersioningStatus.Enabled : BucketVersioningStatus.Suspended,
        MFADelete: MFADelete.Enabled,
      },
    };

    return await $client.send(new PutBucketVersioningCommand(params));
  };

  const getBucketVersioning = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new GetBucketVersioningCommand(params));
  };

  const getBucketPolicy = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new GetBucketPolicyCommand(params));
  };

  const getBucketPolicyStatus = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new GetBucketPolicyStatusCommand(params));
  };

  const putBucketPolicy = async (bucket: string, policy: string) => {
    const params = {
      Bucket: bucket,
      Policy: policy,
    };

    return await $client.send(new PutBucketPolicyCommand(params));
  };

  const getObjectLockConfiguration = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new GetObjectLockConfigurationCommand(params));
  };

  const putObjectLockConfiguration = async (bucket: string, objectLockConfiguration: any) => {
    const params = {
      Bucket: bucket,
      ObjectLockConfiguration: objectLockConfiguration,
    };

    return await $client.send(new PutObjectLockConfigurationCommand(params));
  };

  const getBucketLifecycleConfiguration = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };
    return await $client.send(new GetBucketLifecycleConfigurationCommand(params));
  };
  const putBucketLifecycleConfiguration = async (bucket: string, lifecycleConfiguration: any) => {
    const params = {
      Bucket: bucket,
      LifecycleConfiguration: lifecycleConfiguration,
    };
    return await $client.send(new PutBucketLifecycleConfigurationCommand(params));
  };
  const deleteBucketLifecycle = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };
    return await $client.send(new DeleteBucketLifecycleCommand(params));
  };

  const putObjectRetention = async (bucket: string, key: string, retention: any) => {
    const params = {
      Bucket: bucket,
      Key: key,
      Retention: retention,
    };
    return await $client.send(new PutObjectRetentionCommand(params));
  };
  const getObjectRetention = async (bucket: string, key: string) => {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    return await $client.send(new GetObjectRetentionCommand(params));
  };

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
  };
}
