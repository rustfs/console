import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand
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

  const headBucket = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    };

    return await $client.send(new HeadBucketCommand(params));
  }

  return { listBuckets, createBucket, headBucket };
}
