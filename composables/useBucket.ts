import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  GetBucketTaggingCommand,
  PutBucketTaggingCommand,
  DeleteBucketTaggingCommand,
} from "@aws-sdk/client-s3"

export function useBucket({ region }: { region?: string }) {
  const $client = useNuxtApp().$s3Client

  const listBuckets = async () => {
    return await $client.send(new ListBucketsCommand({}))
  }

  const createBucket = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    }

    return await $client.send(new CreateBucketCommand(params))
  }

  const headBucket = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    }

    return await $client.send(new HeadBucketCommand(params))
  }

  const getBucketTagging = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    }

    return await $client.send(new GetBucketTaggingCommand(params))
  }

  const putBucketTagging = async (bucket: string, tagging: any) => {
    const params = {
      Bucket: bucket,
      Tagging: tagging,
    }

    return await $client.send(new PutBucketTaggingCommand(params))
  }

  const deleteBucketTagging = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    }

    return await $client.send(new DeleteBucketTaggingCommand(params))
  }

  return { listBuckets, createBucket, headBucket, getBucketTagging, putBucketTagging, deleteBucketTagging }
}
