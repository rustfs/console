import {
  CreateBucketCommand,
  ListBucketsCommand,
  DeleteBucketCommand,
  // 策略
  DeleteBucketPolicyCommand,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  // 对象锁定
  PutObjectLockConfigurationCommand,
  // 桶加密
  DeleteBucketEncryptionCommand,
  PutBucketEncryptionCommand,
  GetBucketEncryptionCommand,
  // 生命周期
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  // 版本
  GetBucketVersioningCommand,
} from '@aws-sdk/client-s3';

export function useBucket({ region }: { region?: string }) {
  const $client = useNuxtApp().$s3Client;

  const listBuckets = async () => {
    return await $client.send(new ListBucketsCommand({}));
  };

  const createBucket = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new CreateBucketCommand(params));
  };

  return { listBuckets, createBucket };
}
