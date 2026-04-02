import { hasConsolePermission, type ConsolePolicy } from "./console-policy-parser"
import {
  toAllBucketsArn,
  toBucketArn,
  toObjectArn,
  toObjectPatternArn,
  type PermissionResourceContext,
} from "./permission-resources"

export type ConsoleCapability =
  | "bucket.create"
  | "bucket.delete"
  | "bucket.policy.put"
  | "bucket.policy.delete"
  | "bucket.policy.edit"
  | "bucket.encryption.edit"
  | "bucket.cors.edit"
  | "bucket.tag.edit"
  | "bucket.versioning.edit"
  | "bucket.objectLock.edit"
  | "bucket.quota.edit"
  | "bucket.lifecycle.edit"
  | "bucket.replication.edit"
  | "bucket.events.edit"
  | "objects.upload"
  | "objects.view"
  | "objects.preview"
  | "objects.download"
  | "objects.delete"
  | "objects.bulkDelete"
  | "objects.tag.view"
  | "objects.tag.edit"
  | "objects.legalHold.edit"
  | "objects.retention.edit"
  | "objects.version.view"
  | "objects.share"
  | "accessKeys.create"
  | "accessKeys.edit"
  | "accessKeys.delete"
  | "accessKeys.bulkDelete"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "users.bulkDelete"
  | "users.assignGroups"
  | "users.policy.edit"
  | "policies.create"
  | "policies.edit"
  | "policies.delete"

type ResourceTarget = "none" | "bucket" | "object" | "objectPattern" | "allBuckets"
type RequirementMode = "all" | "any"

interface CapabilityRequirement {
  actions: string[]
  mode?: RequirementMode
  resource: ResourceTarget
}

const CAPABILITY_REQUIREMENTS: Record<ConsoleCapability, CapabilityRequirement[]> = {
  "bucket.create": [{ actions: ["s3:CreateBucket"], resource: "allBuckets" }],
  "bucket.delete": [{ actions: ["s3:DeleteBucket"], resource: "bucket" }],
  "bucket.policy.put": [{ actions: ["s3:PutBucketPolicy"], resource: "bucket" }],
  "bucket.policy.delete": [{ actions: ["s3:DeleteBucketPolicy"], resource: "bucket" }],
  "bucket.policy.edit": [{ actions: ["s3:PutBucketPolicy", "s3:DeleteBucketPolicy"], mode: "any", resource: "bucket" }],
  "bucket.encryption.edit": [{ actions: ["s3:PutBucketEncryption"], resource: "bucket" }],
  "bucket.cors.edit": [{ actions: ["s3:PutBucketCORS"], resource: "bucket" }],
  "bucket.tag.edit": [{ actions: ["s3:PutBucketTagging"], resource: "bucket" }],
  "bucket.versioning.edit": [{ actions: ["s3:PutBucketVersioning"], resource: "bucket" }],
  "bucket.objectLock.edit": [{ actions: ["s3:PutBucketObjectLockConfiguration"], resource: "bucket" }],
  "bucket.quota.edit": [{ actions: ["admin:SetBucketQuota"], resource: "none" }],
  "bucket.lifecycle.edit": [{ actions: ["s3:PutBucketLifecycle"], resource: "bucket" }],
  "bucket.replication.edit": [{ actions: ["s3:PutReplicationConfiguration"], resource: "bucket" }],
  "bucket.events.edit": [{ actions: ["s3:PutBucketNotification"], resource: "bucket" }],
  "objects.upload": [{ actions: ["s3:PutObject"], resource: "objectPattern" }],
  "objects.view": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.preview": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.download": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.delete": [{ actions: ["s3:DeleteObject"], resource: "object" }],
  "objects.bulkDelete": [{ actions: ["s3:DeleteObject"], resource: "objectPattern" }],
  "objects.tag.view": [{ actions: ["s3:GetObjectTagging"], resource: "object" }],
  "objects.tag.edit": [{ actions: ["s3:PutObjectTagging"], resource: "object" }],
  "objects.legalHold.edit": [{ actions: ["s3:PutObjectLegalHold"], resource: "object" }],
  "objects.retention.edit": [{ actions: ["s3:PutObjectRetention"], resource: "object" }],
  "objects.version.view": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.share": [{ actions: ["s3:GetObject"], resource: "object" }],
  "accessKeys.create": [{ actions: ["admin:CreateServiceAccount"], resource: "none" }],
  "accessKeys.edit": [{ actions: ["admin:UpdateServiceAccount"], resource: "none" }],
  "accessKeys.delete": [{ actions: ["admin:RemoveServiceAccount"], resource: "none" }],
  "accessKeys.bulkDelete": [{ actions: ["admin:RemoveServiceAccount"], resource: "none" }],
  "users.create": [{ actions: ["admin:CreateUser"], resource: "none" }],
  "users.edit": [
    { actions: ["admin:GetUser"], resource: "none" },
    { actions: ["admin:CreateUser", "admin:EnableUser", "admin:DisableUser"], mode: "any", resource: "none" },
  ],
  "users.delete": [{ actions: ["admin:DeleteUser"], resource: "none" }],
  "users.bulkDelete": [{ actions: ["admin:DeleteUser"], resource: "none" }],
  "users.assignGroups": [
    { actions: ["admin:AddUserToGroup", "admin:RemoveUserFromGroup"], mode: "any", resource: "none" },
  ],
  "users.policy.edit": [
    { actions: ["admin:AttachUserOrGroupPolicy", "admin:UpdatePolicyAssociation"], mode: "any", resource: "none" },
  ],
  "policies.create": [{ actions: ["admin:CreatePolicy"], resource: "none" }],
  "policies.edit": [{ actions: ["admin:CreatePolicy"], resource: "none" }],
  "policies.delete": [{ actions: ["admin:DeletePolicy"], resource: "none" }],
}

function resolveResource(resource: ResourceTarget, context: PermissionResourceContext): string {
  switch (resource) {
    case "none":
      return "*"
    case "bucket":
      return context.bucket ? toBucketArn(context.bucket) : toAllBucketsArn()
    case "object":
      if (context.bucket && context.objectKey) {
        return toObjectArn(context.bucket, context.objectKey)
      }
      return toObjectPatternArn(context.bucket, context.prefix)
    case "objectPattern":
      return toObjectPatternArn(context.bucket, context.prefix ?? context.objectKey)
    case "allBuckets":
      return toAllBucketsArn()
  }
}

export function hasConsoleCapability(
  policy: ConsolePolicy | null | undefined,
  capability: ConsoleCapability,
  context: PermissionResourceContext = {},
): boolean {
  if (!policy) return false

  const requirements = CAPABILITY_REQUIREMENTS[capability]
  if (!requirements) return false

  return requirements.every((requirement) => {
    const resource = resolveResource(requirement.resource, context)
    const mode = requirement.mode ?? "all"

    if (mode === "any") {
      return requirement.actions.some((action) => hasConsolePermission(policy, action, resource))
    }

    return requirement.actions.every((action) => hasConsolePermission(policy, action, resource))
  })
}
