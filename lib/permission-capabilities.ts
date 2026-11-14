import { hasConsolePermission, type ConsolePolicy } from "./console-policy-parser"
import type { ActionPermissionCheck, PermissionDecision, PermissionResult } from "./effective-permissions"
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
  | "bucket.onDemandMigration.view"
  | "bucket.onDemandMigration.edit"
  | "objects.upload"
  | "objects.view"
  | "objects.preview"
  | "objects.download"
  | "objects.rename"
  | "objects.copy"
  | "objects.move"
  | "objects.transferDestination"
  | "objects.delete"
  | "objects.forceCleanup"
  | "objects.bulkDelete"
  | "objects.tag.view"
  | "objects.tag.edit"
  | "objects.legalHold.edit"
  | "objects.retention.edit"
  | "objects.version.view"
  | "objects.version.list"
  | "objects.version.preview"
  | "objects.version.delete"
  | "objects.version.download"
  | "objects.version.restore"
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

type ResourceTarget = "none" | "bucket" | "object" | "exactObject" | "objectPattern" | "allBuckets"
type RequirementMode = "all" | "any"

interface CapabilityRequirement {
  actions: string[]
  mode?: RequirementMode
  resource: ResourceTarget
}

const CAPABILITY_REQUIREMENTS: Record<ConsoleCapability, CapabilityRequirement[]> = {
  "bucket.create": [{ actions: ["s3:CreateBucket"], resource: "bucket" }],
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
  "bucket.onDemandMigration.view": [{ actions: ["admin:GetBucketOnDemandMigration"], resource: "none" }],
  "bucket.onDemandMigration.edit": [{ actions: ["admin:SetBucketOnDemandMigration"], resource: "none" }],
  "objects.upload": [{ actions: ["s3:PutObject"], resource: "objectPattern" }],
  "objects.view": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.preview": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.download": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.copy": [{ actions: ["s3:GetObject"], resource: "exactObject" }],
  "objects.move": [{ actions: ["s3:GetObject", "s3:DeleteObject"], resource: "exactObject" }],
  "objects.transferDestination": [{ actions: ["s3:PutObject"], resource: "exactObject" }],
  "objects.rename": [
    { actions: ["s3:GetObject", "s3:DeleteObject"], resource: "object" },
    { actions: ["s3:PutObject"], resource: "objectPattern" },
  ],
  "objects.delete": [{ actions: ["s3:DeleteObject"], resource: "object" }],
  "objects.forceCleanup": [{ actions: ["s3:DeleteObject", "s3:ForceDeleteObject"], resource: "exactObject" }],
  "objects.bulkDelete": [{ actions: ["s3:DeleteObject"], resource: "objectPattern" }],
  "objects.tag.view": [{ actions: ["s3:GetObjectTagging"], resource: "object" }],
  "objects.tag.edit": [{ actions: ["s3:PutObjectTagging"], resource: "object" }],
  "objects.legalHold.edit": [{ actions: ["s3:PutObjectLegalHold"], resource: "object" }],
  "objects.retention.edit": [{ actions: ["s3:PutObjectRetention"], resource: "object" }],
  "objects.version.view": [{ actions: ["s3:GetObject"], resource: "object" }],
  "objects.version.list": [{ actions: ["s3:ListBucketVersions"], resource: "bucket" }],
  "objects.version.preview": [{ actions: ["s3:GetObjectVersion"], resource: "exactObject" }],
  "objects.version.delete": [{ actions: ["s3:DeleteObjectVersion"], resource: "exactObject" }],
  "objects.version.download": [{ actions: ["s3:GetObjectVersion"], resource: "exactObject" }],
  "objects.version.restore": [{ actions: ["s3:GetObjectVersion", "s3:PutObject"], resource: "exactObject" }],
  "objects.share": [{ actions: ["s3:GetObject"], resource: "object" }],
  "accessKeys.create": [{ actions: ["admin:CreateServiceAccount"], resource: "none" }],
  "accessKeys.edit": [{ actions: ["admin:UpdateServiceAccount"], resource: "none" }],
  "accessKeys.delete": [{ actions: ["admin:RemoveServiceAccount"], resource: "none" }],
  "accessKeys.bulkDelete": [{ actions: ["admin:RemoveServiceAccount"], resource: "none" }],
  "users.create": [{ actions: ["admin:CreateUser"], resource: "none" }],
  "users.edit": [
    { actions: ["admin:GetUser"], resource: "none" },
    { actions: ["admin:CreateUser", "admin:EnableUser"], mode: "any", resource: "none" },
  ],
  "users.delete": [{ actions: ["admin:DeleteUser"], resource: "none" }],
  "users.bulkDelete": [{ actions: ["admin:DeleteUser"], resource: "none" }],
  "users.assignGroups": [{ actions: ["admin:AddUserToGroup"], resource: "none" }],
  "users.policy.edit": [{ actions: ["admin:AttachUserOrGroupPolicy"], resource: "none" }],
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
    case "exactObject":
      if (context.bucket && context.objectKey) {
        return resource === "exactObject"
          ? `${toBucketArn(context.bucket)}/${context.objectKey}`
          : toObjectArn(context.bucket, context.objectKey)
      }
      return toObjectPatternArn(context.bucket, context.prefix)
    case "objectPattern":
      return toObjectPatternArn(context.bucket, context.prefix ?? context.objectKey)
    case "allBuckets":
      return toAllBucketsArn()
  }
}

export interface CapabilityCheck {
  capability: ConsoleCapability
  context?: PermissionResourceContext
}

export interface CapabilityCheckGroup {
  mode: RequirementMode
  checks: ActionPermissionCheck[]
}

/** Map a UI operation to actual authorization targets; never submit an ARN wildcard as an object. */
export function capabilityCheckGroups(
  capability: ConsoleCapability,
  context: PermissionResourceContext = {},
): CapabilityCheckGroup[] {
  if (capability === "objects.forceCleanup" && !isForceCleanupTarget(context)) return []
  return CAPABILITY_REQUIREMENTS[capability].map((requirement) => ({
    mode: requirement.mode ?? "all",
    checks: requirement.actions.flatMap((configuredAction) => {
      let action = configuredAction
      let target = { ...context }
      delete target.targetObjectKey
      if (capability === "objects.version.list") {
        target = { bucket: context.bucket, prefix: context.prefix ?? context.objectKey }
      } else if (capability === "objects.rename" && action === "s3:PutObject") {
        target = {
          bucket: context.bucket,
          objectKey: context.targetObjectKey,
          operation: "CopyObject",
          ifMatch: null,
          ifNoneMatch: "*",
          copySource: { bucket: context.bucket ?? "", objectKey: context.objectKey ?? "" },
        }
      } else if (capability === "objects.version.restore" && action === "s3:PutObject") {
        target = {
          bucket: context.bucket,
          objectKey: context.objectKey,
          operation: "CopyObject",
          ifMatch: null,
          ifNoneMatch: null,
          copySource: {
            bucket: context.bucket ?? "",
            objectKey: context.objectKey ?? "",
            ...(context.versionId !== undefined && { versionId: context.versionId }),
          },
        }
      }
      if (
        (capability === "objects.version.preview" || capability === "objects.version.download") &&
        context.versionId === "00000000-0000-0000-0000-000000000000" &&
        action === "s3:GetObjectVersion"
      ) {
        action = "s3:GetObject"
        delete target.versionId
      }
      if (action !== "s3:ListBucket" && action !== "s3:ListBucketVersions") delete target.prefix
      if (action.startsWith("s3:")) {
        const signedDownload =
          capability === "objects.download" ||
          capability === "objects.share" ||
          capability === "objects.version.download"
        target.authType = context.authType ?? (signedDownload ? "REST-QUERY-STRING" : "REST-HEADER")
        if (
          (capability === "objects.preview" || capability === "objects.version.preview") &&
          context.authType === undefined
        ) {
          return [
            { action, context: target },
            { action, context: { ...target, authType: "REST-QUERY-STRING" as const } },
          ]
        }
      }
      return [{ action, context: target }]
    }),
  }))
}

export function capabilityDecision(
  groups: CapabilityCheckGroup[],
  result: (check: ActionPermissionCheck) => PermissionResult | undefined,
): PermissionDecision {
  const decisions = groups.map(({ mode, checks }) => {
    const values = checks.map((check) => result(check)?.decision ?? "unknown")
    if (mode === "any")
      return values.includes("allowed") ? "allowed" : values.every((value) => value === "denied") ? "denied" : "unknown"
    return values.includes("denied") ? "denied" : values.every((value) => value === "allowed") ? "allowed" : "unknown"
  })
  return decisions.includes("denied")
    ? "denied"
    : decisions.every((value) => value === "allowed")
      ? "allowed"
      : "unknown"
}

export function isForceCleanupTarget(context: PermissionResourceContext): boolean {
  return Boolean(context.bucket && context.objectKey?.endsWith("/") && /[^/]/.test(context.objectKey))
}

export function hasConsoleCapability(
  policy: ConsolePolicy | null | undefined,
  capability: ConsoleCapability,
  context: PermissionResourceContext = {},
): boolean {
  if (capability === "objects.forceCleanup" && !isForceCleanupTarget(context)) return false
  if (!policy) return false

  const requirements = CAPABILITY_REQUIREMENTS[capability]
  if (!requirements) return false

  return requirements.every((requirement) => {
    const actions = requirement.actions.map((action) =>
      (capability === "objects.version.preview" || capability === "objects.version.download") &&
      context.versionId === "00000000-0000-0000-0000-000000000000" &&
      action === "s3:GetObjectVersion"
        ? "s3:GetObject"
        : action,
    )
    const resource =
      capability === "objects.rename" && requirement.actions.includes("s3:PutObject") && context.targetObjectKey
        ? toObjectArn(context.bucket ?? "", context.targetObjectKey)
        : requirement.resource === "objectPattern" && context.objectKey && capability !== "objects.rename"
          ? toObjectArn(context.bucket ?? "", context.objectKey)
          : resolveResource(requirement.resource, context)
    const mode = requirement.mode ?? "all"

    if (mode === "any") {
      return actions.some((action) => hasConsolePermission(policy, action, resource))
    }

    return actions.every((action) => hasConsolePermission(policy, action, resource))
  })
}
