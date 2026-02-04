export function resourceMatch(pattern: string, resource: string): boolean {
  if (!pattern) {
    return resource === pattern
  }
  if (pattern === "*") {
    return true
  }
  const parts = pattern.split("*")
  if (parts.length === 1) {
    return resource === pattern
  }
  const tGlob = pattern.endsWith("*")
  const end = parts.length - 1
  const firstPart = parts[0] ?? ""
  if (!resource.startsWith(firstPart)) {
    return false
  }
  let remainingResource = resource.slice(firstPart.length)
  for (let i = 1; i < end; i++) {
    const part = parts[i]
    if (!part) {
      continue
    }
    if (!remainingResource.includes(part)) {
      return false
    }
    const idx = remainingResource.indexOf(part) + part.length
    remainingResource = remainingResource.slice(idx)
  }
  const lastPart = parts[end] ?? ""
  if (tGlob) {
    return true
  }
  return remainingResource.endsWith(lastPart) || resource.endsWith(lastPart)
}

const awsResourcePrefix = "arn:aws:s3:::"
const commonBucketActions = new Set<string>(["s3:GetBucketLocation"])
const readOnlyBucketActions = new Set<string>(["s3:ListBucket"])
const writeOnlyBucketActions = new Set<string>(["s3:ListBucketMultipartUploads"])
const readOnlyObjectActions = new Set<string>(["s3:GetObject"])
const writeOnlyObjectActions = new Set<string>([
  "s3:AbortMultipartUpload",
  "s3:DeleteObject",
  "s3:ListMultipartUploadParts",
  "s3:PutObject",
])
export type BucketPolicyType = "none" | "readonly" | "readwrite" | "writeonly" | "private" | "public"

export interface PolicyResource {
  bucket: string
  object?: string
}

export interface PolicyStatement {
  Effect: "Allow" | "Deny"
  Principal: { AWS: string[] }
  Action: string[]
  Resource: string[]
  Conditions?: Record<string, unknown>
  Sid?: string
}

function formatResourceArn(resource: PolicyResource): string {
  const bn = resource.bucket
  if (!bn) throw new Error("Invalid resource: bucket is required")
  return resource.object ? `${awsResourcePrefix}${bn}/${resource.object}` : `${awsResourcePrefix}${bn}`
}

function createAllowStatement(principals: string[], actions: string[], resources: PolicyResource[]): PolicyStatement {
  return {
    Effect: "Allow",
    Principal: { AWS: principals },
    Action: actions,
    Resource: resources.map(formatResourceArn),
  }
}

function createDenyStatement(principals: string[], actions: string[], resources: PolicyResource[]): PolicyStatement {
  return {
    Effect: "Deny",
    Principal: { AWS: principals },
    Action: actions,
    Resource: resources.map(formatResourceArn),
  }
}

function createPrivatePolicy(bucketName: string, prefix: string): PolicyStatement[] {
  const objectPattern = prefix ? `${prefix}*` : "*"
  return [
    createAllowStatement(["arn:aws:iam::*:root"], ["s3:*"], [{ bucket: bucketName, object: objectPattern }]),
    createDenyStatement(["*"], ["s3:*"], [{ bucket: bucketName, object: objectPattern }]),
  ]
}

function createPublicPolicy(bucketName: string, prefix: string): PolicyStatement[] {
  const objectPattern = prefix ? `${prefix}*` : "*"
  return [
    createAllowStatement(
      ["*"],
      ["s3:GetObject", "s3:GetObjectTagging", "s3:ListBucket", "s3:GetBucketLocation"],
      [{ bucket: bucketName, object: objectPattern }],
    ),
    createAllowStatement(
      ["arn:aws:iam::*:root"],
      ["s3:PutObject", "s3:DeleteObject", "s3:PutObjectTagging", "s3:DeleteObjectTagging"],
      [{ bucket: bucketName, object: objectPattern }],
    ),
  ]
}

/**
 * Detect bucket policy type from S3 policy statements.
 */
export function detectBucketPolicy(
  statements: PolicyStatement[],
  bucketName: string,
  prefix: string,
): BucketPolicyType {
  const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`

  const hasPublicReadAccess = statements.some(
    (s) =>
      s.Effect === "Allow" &&
      s.Principal?.AWS?.includes("*") &&
      s.Resource?.includes(objectResource) &&
      s.Action?.some((a) =>
        ["s3:GetObject", "s3:GetObjectTagging", "s3:ListBucket", "s3:GetBucketLocation"].includes(a),
      ),
  )
  const hasOwnerWriteAccess = statements.some(
    (s) =>
      s.Effect === "Allow" &&
      s.Principal?.AWS?.includes("arn:aws:iam::*:root") &&
      s.Resource?.includes(objectResource) &&
      s.Action?.some((a) =>
        ["s3:PutObject", "s3:DeleteObject", "s3:PutObjectTagging", "s3:DeleteObjectTagging"].includes(a),
      ),
  )
  if (hasPublicReadAccess && hasOwnerWriteAccess) return "public"

  const hasOwnerFullAccess = statements.some(
    (s) =>
      s.Effect === "Allow" &&
      s.Principal?.AWS?.includes("arn:aws:iam::*:root") &&
      s.Resource?.includes(objectResource) &&
      s.Action?.includes("s3:*"),
  )
  const hasDenyAllOthers = statements.some(
    (s) =>
      s.Effect === "Deny" &&
      s.Principal?.AWS?.includes("*") &&
      s.Resource?.includes(objectResource) &&
      s.Action?.includes("s3:*"),
  )
  if (hasOwnerFullAccess && hasDenyAllOthers) return "private"

  return "none"
}

/**
 * Build policy statements for the given bucket policy type.
 */
export function setBucketPolicy(
  statements: PolicyStatement[],
  policy: BucketPolicyType,
  bucketName: string,
  prefix: string,
): PolicyStatement[] {
  const bucketResource = `${awsResourcePrefix}${bucketName}`
  const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`

  const filtered = statements.filter(
    (s) => !s.Resource?.includes(bucketResource) && !s.Resource?.includes(objectResource),
  )

  let newStatements: PolicyStatement[] = []

  if (policy === "private") {
    newStatements = createPrivatePolicy(bucketName, prefix)
  } else if (policy === "public") {
    newStatements = createPublicPolicy(bucketName, prefix)
  } else {
    newStatements.push(createAllowStatement(["*"], Array.from(commonBucketActions), [{ bucket: bucketName }]))
    if (policy === "readonly" || policy === "readwrite") {
      newStatements.push(
        createAllowStatement(["*"], Array.from(readOnlyBucketActions), [{ bucket: bucketName }]),
        createAllowStatement(["*"], Array.from(readOnlyObjectActions), [{ bucket: bucketName, object: `${prefix}*` }]),
      )
    }
    if (policy === "writeonly" || policy === "readwrite") {
      newStatements.push(
        createAllowStatement(["*"], Array.from(writeOnlyBucketActions), [{ bucket: bucketName }]),
        createAllowStatement(["*"], Array.from(writeOnlyObjectActions), [{ bucket: bucketName, object: `${prefix}*` }]),
      )
    }
  }

  return [...filtered, ...newStatements]
}
