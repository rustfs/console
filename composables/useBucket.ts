import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  GetBucketTaggingCommand,
  PutBucketTaggingCommand,
  DeleteBucketTaggingCommand,
  PutBucketVersioningCommand,
  GetBucketVersioningCommand,
  MFADelete,
  BucketVersioningStatus,
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

  const putBucketVersioning = async (bucket: string, status: string) => {
    const params = {
      Bucket: bucket,
      VersioningConfiguration: {
        Status: status == "Enabled" ? BucketVersioningStatus.Enabled : BucketVersioningStatus.Suspended,
        MFADelete: MFADelete.Enabled,
      },
    }

    return await $client.send(new PutBucketVersioningCommand(params))
  }

  const getBucketVersioning = async (bucket: string) => {
    const params = {
      Bucket: bucket,
    }

    return await $client.send(new GetBucketVersioningCommand(params))
  }

  return {
    listBuckets,
    createBucket,
    headBucket,
    getBucketTagging,
    putBucketTagging,
    deleteBucketTagging,
    putBucketVersioning,
    getBucketVersioning,
  }
}
