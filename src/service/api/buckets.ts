import { request } from '../http'

// 桶数据结构
export interface Bucket {
  /** @minLength 3 */
  name: string
  /** @format int64 */
  size?: number
  access?: BucketAccess
  definition?: string
  rw_access?: {
    write?: boolean
    read?: boolean
  }
  /** @format int64 */
  objects?: number
  details?: {
    versioning?: boolean
    versioningSuspended?: boolean
    locking?: boolean
    replication?: boolean
    tags?: Record<string, string>
    quota?: {
      /** @format int64 */
      quota?: number
      type?: 'hard'
    }
  }
  creation_date?: string
}

export enum BucketAccess {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  CUSTOM = 'CUSTOM',
}

// 获取桶列表
export function listBuckets() {
  const methodInstance = request.Get('/buckets')
  return methodInstance
}

export interface SetBucketVersioning {
  enabled?: boolean
  /** @maxLength 10 */
  excludePrefixes?: string[]
  excludeFolders?: boolean
}

// 创建桶的请求数据类型
export interface MakeBucketRequest {
  name: string
  locking?: boolean
  versioning?: SetBucketVersioning
  quota?: SetBucketQuota
  retention?: PutBucketRetentionRequest
}

// 创建桶成功之后的响应数据类型
export interface MakeBucketsResponse {
  bucketName?: string
}
// 创建桶
export function makeBucket(body: MakeBucketRequest) {
  const methodInstance = request.Post('/account/change-user-password', body)
  return methodInstance
}

export function setBucketVersioning(bucketName: string, body: SetBucketVersioning) {
  const methodInstance = request.Post(`/buckets/${bucketName}/versioning`, body)
  return methodInstance
}

export interface SetBucketQuota {
  enabled: boolean
  quota_type?: 'hard'
  amount?: number
}
export function setBucketQuota(name: string, body: SetBucketQuota) {
  const methodInstance = request.Post(`/buckets/${name}/versioning`, body)
  return methodInstance
}

export enum ObjectRetentionMode {
  Governance = 'governance',
  Compliance = 'compliance',
}

export enum ObjectRetentionUnit {
  Days = 'days',
  Years = 'years',
}
export interface PutBucketRetentionRequest {
  mode: ObjectRetentionMode
  unit: ObjectRetentionUnit
  /** @format int32 */
  validity: number
}
