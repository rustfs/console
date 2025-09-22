/**
 * 策略效果枚举
 */
export enum PolicyEffect {
  Allow = 'Allow',
  Deny = 'Deny',
}

/**
 * 策略动作枚举
 */
export enum PolicyAction {
  // 对象操作
  GetObject = 's3:GetObject',
  PutObject = 's3:PutObject',
  DeleteObject = 's3:DeleteObject',
  ListObjects = 's3:ListObjects',
  GetObjectTagging = 's3:GetObjectTagging',
  PutObjectTagging = 's3:PutObjectTagging',
  DeleteObjectTagging = 's3:DeleteObjectTagging',

  // 存储桶操作
  GetBucketLocation = 's3:GetBucketLocation',
  ListBucket = 's3:ListBucket',
  GetBucketTagging = 's3:GetBucketTagging',
  PutBucketTagging = 's3:PutBucketTagging',
  DeleteBucketTagging = 's3:DeleteBucketTagging',

  // 策略操作
  GetBucketPolicy = 's3:GetBucketPolicy',
  PutBucketPolicy = 's3:PutBucketPolicy',
  DeleteBucketPolicy = 's3:DeleteBucketPolicy',

  // 其他操作
  AllActions = 's3:*',
}

/**
 * 存储桶策略类型
 */
export type BucketPolicyType = 'none' | 'readonly' | 'readwrite' | 'writeonly' | 'private' | 'public';

/**
 * 存储桶策略常量
 */
export const BucketPolicyConstants = {
  None: 'none' as BucketPolicyType,
  ReadOnly: 'readonly' as BucketPolicyType,
  ReadWrite: 'readwrite' as BucketPolicyType,
  WriteOnly: 'writeonly' as BucketPolicyType,
  Private: 'private' as BucketPolicyType,
  Public: 'public' as BucketPolicyType,
};

/**
 * 策略资源接口
 */
export interface PolicyResource {
  bucket: string;
  object?: string;
}

/**
 * 策略语句接口
 */
export interface PolicyStatement {
  Effect: PolicyEffect;
  Principal: {
    AWS: string[];
  };
  Action: PolicyAction[];
  Resource: string[];
  Conditions?: Record<string, any>;
  Sid?: string;
}

/**
 * 存储桶策略接口
 */
export interface BucketPolicy {
  Version: string;
  Statement: PolicyStatement[];
}

// AWS 资源前缀
const awsResourcePrefix = 'arn:aws:s3:::';

// 预定义的权限集合
const commonBucketActions = new Set<string>(['s3:GetBucketLocation']);
const readOnlyBucketActions = new Set<string>(['s3:ListBucket']);
const writeOnlyBucketActions = new Set<string>(['s3:ListBucketMultipartUploads']);
const readOnlyObjectActions = new Set<string>(['s3:GetObject']);
const writeOnlyObjectActions = new Set<string>([
  's3:AbortMultipartUpload',
  's3:DeleteObject',
  's3:ListMultipartUploadParts',
  's3:PutObject',
]);
const readWriteObjectActions = new Set([...readOnlyObjectActions, ...writeOnlyObjectActions]);

// 所有有效的动作集合
const validActions = new Set([
  ...Array.from(commonBucketActions),
  ...Array.from(readOnlyBucketActions),
  ...Array.from(writeOnlyBucketActions),
  ...Array.from(readOnlyObjectActions),
  ...Array.from(writeOnlyObjectActions),
]);

/**
 * 集合操作工具函数
 */
function setUnion<T>(...sets: Set<T>[]): Set<T> {
  return new Set(sets.flatMap(set => [...set]));
}

function setIntersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  return new Set([...setA].filter(x => setB.has(x)));
}

function areSetsEqual(set1: Set<any>, set2: Set<any>): boolean {
  if (set1.size !== set2.size) return false;
  for (const item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
}

/**
 * 深度比较两个对象
 */
function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 条件合并接口
 */
interface Condition {
  [key: string]: { [key: string]: string | string[] };
}

/**
 * 合并条件映射
 */
function mergeConditionMap(a: Condition, b: Condition): Condition {
  const merged: Condition = { ...a };
  for (const [key, value] of Object.entries(b)) {
    merged[key] = { ...merged[key], ...value };
  }
  return merged;
}

/**
 * 验证策略语句
 */
export function validateStatement(statement: PolicyStatement): boolean {
  if (!statement.Effect || !statement.Principal?.AWS || !statement.Action || !statement.Resource) {
    return false;
  }

  if (!Array.isArray(statement.Principal.AWS) || statement.Principal.AWS.length === 0) {
    return false;
  }

  if (!Array.isArray(statement.Action) || statement.Action.length === 0) {
    return false;
  }

  if (!Array.isArray(statement.Resource) || statement.Resource.length === 0) {
    return false;
  }

  return true;
}

/**
 * 验证存储桶策略
 */
export function validatePolicy(policy: BucketPolicy): boolean {
  if (!policy.Version || !policy.Statement) {
    return false;
  }

  if (!Array.isArray(policy.Statement) || policy.Statement.length === 0) {
    return false;
  }

  return policy.Statement.every(validateStatement);
}

/**
 * 格式化资源 ARN
 */
export function formatResourceArn(resource: PolicyResource): string {
  const { bucket, object } = resource;
  return object ? `${awsResourcePrefix}${bucket}/${object}` : `${awsResourcePrefix}${bucket}`;
}

/**
 * 资源匹配检查
 */
export function resourceMatch(pattern: string, resource: string): boolean {
  if (!pattern) {
    return resource === pattern;
  }
  if (pattern === '*') {
    return true;
  }
  const parts = pattern.split('*');
  if (parts.length === 1) {
    return resource === pattern;
  }
  const tGlob = pattern.endsWith('*');
  const end = parts.length - 1;
  if (!resource.startsWith(parts[0])) {
    return false;
  }
  for (let i = 1; i < end; i++) {
    if (!resource.includes(parts[i])) {
      return false;
    }
    const idx = resource.indexOf(parts[i]) + parts[i].length;
    resource = resource.slice(idx);
  }
  return tGlob || resource.endsWith(parts[end]);
}

/**
 * 创建存储桶策略
 */
export function createBucketPolicy(statements: PolicyStatement[]): BucketPolicy {
  const policy: BucketPolicy = {
    Version: '2012-10-17',
    Statement: statements,
  };

  if (!validatePolicy(policy)) {
    throw new Error('Invalid bucket policy');
  }

  return policy;
}

/**
 * 创建允许访问的语句
 */
export function createAllowStatement(
  principals: string[],
  actions: PolicyAction[],
  resources: PolicyResource[]
): PolicyStatement {
  const statement: PolicyStatement = {
    Effect: PolicyEffect.Allow,
    Principal: {
      AWS: principals,
    },
    Action: actions,
    Resource: resources.map(formatResourceArn),
  };

  if (!validateStatement(statement)) {
    throw new Error('Invalid policy statement');
  }

  return statement;
}

/**
 * 创建拒绝访问的语句
 */
export function createDenyStatement(
  principals: string[],
  actions: PolicyAction[],
  resources: PolicyResource[]
): PolicyStatement {
  const statement: PolicyStatement = {
    Effect: PolicyEffect.Deny,
    Principal: {
      AWS: principals,
    },
    Action: actions,
    Resource: resources.map(formatResourceArn),
  };

  if (!validateStatement(statement)) {
    throw new Error('Invalid policy statement');
  }

  return statement;
}

/**
 * 合并策略语句
 */
function appendStatement(statements: PolicyStatement[], statement: PolicyStatement): PolicyStatement[] {
  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];

    // 检查是否可以合并动作
    if (
      areSetsEqual(new Set(s.Action), new Set(statement.Action)) &&
      s.Effect === statement.Effect &&
      areSetsEqual(new Set(s.Principal.AWS), new Set(statement.Principal.AWS)) &&
      deepEqual(s.Conditions, statement.Conditions)
    ) {
      statements[i].Resource = [...new Set([...s.Resource, ...statement.Resource])];
      return statements;
    }

    // 检查是否可以合并资源
    if (
      areSetsEqual(new Set(s.Resource), new Set(statement.Resource)) &&
      s.Effect === statement.Effect &&
      areSetsEqual(new Set(s.Principal.AWS), new Set(statement.Principal.AWS)) &&
      deepEqual(s.Conditions, statement.Conditions)
    ) {
      statements[i].Action = [...new Set([...s.Action, ...statement.Action])];
      return statements;
    }

    // 检查资源交集
    const resourceIntersection = setIntersection(new Set(s.Resource), new Set(statement.Resource));
    const actionIntersection = setIntersection(new Set(s.Action), new Set(statement.Action));
    const principalIntersection = setIntersection(new Set(s.Principal.AWS), new Set(statement.Principal.AWS));

    if (
      areSetsEqual(resourceIntersection, new Set(statement.Resource)) &&
      areSetsEqual(actionIntersection, new Set(statement.Action)) &&
      s.Effect === statement.Effect &&
      areSetsEqual(principalIntersection, new Set(statement.Principal.AWS))
    ) {
      if (deepEqual(s.Conditions, statement.Conditions)) {
        return statements;
      }

      if (s.Conditions && statement.Conditions) {
        if (areSetsEqual(new Set(s.Resource), new Set(statement.Resource))) {
          statements[i].Conditions = mergeConditionMap(s.Conditions, statement.Conditions);
          return statements;
        }
      }
    }
  }

  if (!(statement.Action.length === 0 && statement.Resource.length === 0)) {
    return [...statements, statement];
  }

  return statements;
}

/**
 * 合并多个策略语句
 */
export function appendStatements(
  statements: PolicyStatement[],
  appendStatements: PolicyStatement[]
): PolicyStatement[] {
  for (const s of appendStatements) {
    statements = appendStatement(statements, s);
  }
  return statements;
}

/**
 * 获取存储桶策略
 */
export function getBucketPolicy(statements: PolicyStatement[], bucketName: string, prefix: string): BucketPolicyType {
  const bucketResource = `${awsResourcePrefix}${bucketName}`;
  const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`;

  let bucketCommonFound = false;
  let bucketReadOnly = false;
  let bucketWriteOnly = false;
  let objReadOnly = false;
  let objWriteOnly = false;
  let isPrivate = false;
  let isPublic = false;

  // 检查是否为公共权限
  const hasPublicReadAccess = statements.some(
    s =>
      s.Effect === PolicyEffect.Allow &&
      s.Principal.AWS.includes('*') &&
      s.Resource.includes(objectResource) &&
      s.Action.some(
        action =>
          action === PolicyAction.GetObject ||
          action === PolicyAction.GetObjectTagging ||
          action === PolicyAction.ListBucket ||
          action === PolicyAction.GetBucketLocation
      )
  );

  const hasOwnerWriteAccess = statements.some(
    s =>
      s.Effect === PolicyEffect.Allow &&
      s.Principal.AWS.includes('arn:aws:iam::*:root') &&
      s.Resource.includes(objectResource) &&
      s.Action.some(
        action =>
          action === PolicyAction.PutObject ||
          action === PolicyAction.DeleteObject ||
          action === PolicyAction.PutObjectTagging ||
          action === PolicyAction.DeleteObjectTagging
      )
  );

  // 如果同时满足公共读取和所有者写入，则认为是公共权限
  if (hasPublicReadAccess && hasOwnerWriteAccess) {
    return BucketPolicyConstants.Public;
  }

  // 检查是否为私有权限
  const hasOwnerFullAccess = statements.some(
    s =>
      s.Effect === PolicyEffect.Allow &&
      s.Principal.AWS.includes('arn:aws:iam::*:root') &&
      s.Resource.includes(objectResource) &&
      s.Action.includes(PolicyAction.AllActions)
  );

  const hasDenyAllOthers = statements.some(
    s =>
      s.Effect === PolicyEffect.Deny &&
      s.Principal.AWS.includes('*') &&
      s.Resource.includes(objectResource) &&
      s.Action.includes(PolicyAction.AllActions)
  );

  if (hasOwnerFullAccess && hasDenyAllOthers) {
    return BucketPolicyConstants.Private;
  }

  // 检查其他权限类型
  for (const s of statements) {
    // 检查存储桶权限
    if (s.Resource.includes(bucketResource)) {
      const hasCommonActions = s.Action.some(action => commonBucketActions.has(action));
      const hasReadOnlyActions = s.Action.some(action => readOnlyBucketActions.has(action));
      const hasWriteOnlyActions = s.Action.some(action => writeOnlyBucketActions.has(action));

      if (hasCommonActions && s.Effect === PolicyEffect.Allow) {
        bucketCommonFound = true;
      }
      if (hasReadOnlyActions && s.Effect === PolicyEffect.Allow) {
        bucketReadOnly = true;
      }
      if (hasWriteOnlyActions && s.Effect === PolicyEffect.Allow) {
        bucketWriteOnly = true;
      }
    }

    // 检查对象权限
    if (s.Resource.includes(objectResource)) {
      const hasReadOnlyActions = s.Action.some(action => readOnlyObjectActions.has(action));
      const hasWriteOnlyActions = s.Action.some(action => writeOnlyObjectActions.has(action));

      if (hasReadOnlyActions && s.Effect === PolicyEffect.Allow) {
        objReadOnly = true;
      }
      if (hasWriteOnlyActions && s.Effect === PolicyEffect.Allow) {
        objWriteOnly = true;
      }
    }
  }

  if (bucketCommonFound) {
    if (bucketReadOnly && bucketWriteOnly && objReadOnly && objWriteOnly) {
      return BucketPolicyConstants.ReadWrite;
    } else if (bucketReadOnly && objReadOnly) {
      return BucketPolicyConstants.ReadOnly;
    } else if (bucketWriteOnly && objWriteOnly) {
      return BucketPolicyConstants.WriteOnly;
    }
  }

  return BucketPolicyConstants.None;
}

/**
 * 创建私有访问策略
 */
export function createPrivatePolicy(bucketName: string, prefix: string): PolicyStatement[] {
  return [
    // 只允许存储桶所有者访问
    createAllowStatement(
      ['arn:aws:iam::*:root'], // 存储桶所有者
      [PolicyAction.AllActions],
      [{ bucket: bucketName, object: `${prefix}*` }]
    ),
    // 拒绝所有其他访问
    createDenyStatement(['*'], [PolicyAction.AllActions], [{ bucket: bucketName, object: `${prefix}*` }]),
  ];
}

/**
 * 创建公共访问策略
 */
export function createPublicPolicy(bucketName: string, prefix: string): PolicyStatement[] {
  return [
    // 允许所有人读取
    createAllowStatement(
      ['*'],
      [PolicyAction.GetObject, PolicyAction.GetObjectTagging, PolicyAction.ListBucket, PolicyAction.GetBucketLocation],
      [{ bucket: bucketName, object: `${prefix}*` }]
    ),
    // 只允许存储桶所有者写入
    createAllowStatement(
      ['arn:aws:iam::*:root'], // 存储桶所有者
      [
        PolicyAction.PutObject,
        PolicyAction.DeleteObject,
        PolicyAction.PutObjectTagging,
        PolicyAction.DeleteObjectTagging,
      ],
      [{ bucket: bucketName, object: `${prefix}*` }]
    ),
  ];
}

/**
 * 设置存储桶策略
 */
export function setBucketPolicy(
  statements: PolicyStatement[],
  policy: BucketPolicyType,
  bucketName: string,
  prefix: string
): PolicyStatement[] {
  // 移除现有策略
  const filteredStatements = statements.filter(s => {
    const bucketResource = `${awsResourcePrefix}${bucketName}`;
    const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`;
    return !s.Resource.includes(bucketResource) && !s.Resource.includes(objectResource);
  });

  // 创建新策略
  let newStatements: PolicyStatement[] = [];

  switch (policy) {
    case BucketPolicyConstants.Private:
      newStatements = createPrivatePolicy(bucketName, prefix);
      break;

    case BucketPolicyConstants.Public:
      newStatements = createPublicPolicy(bucketName, prefix);
      break;

    default:
      // 添加通用存储桶权限
      newStatements.push(
        createAllowStatement(['*'], Array.from(commonBucketActions) as PolicyAction[], [{ bucket: bucketName }])
      );

      // 根据策略类型添加其他权限
      if (policy === BucketPolicyConstants.ReadOnly || policy === BucketPolicyConstants.ReadWrite) {
        newStatements.push(
          createAllowStatement(['*'], Array.from(readOnlyBucketActions) as PolicyAction[], [{ bucket: bucketName }])
        );
        newStatements.push(
          createAllowStatement(['*'], Array.from(readOnlyObjectActions) as PolicyAction[], [
            { bucket: bucketName, object: `${prefix}*` },
          ])
        );
      }

      if (policy === BucketPolicyConstants.WriteOnly || policy === BucketPolicyConstants.ReadWrite) {
        newStatements.push(
          createAllowStatement(['*'], Array.from(writeOnlyBucketActions) as PolicyAction[], [{ bucket: bucketName }])
        );
        newStatements.push(
          createAllowStatement(['*'], Array.from(writeOnlyObjectActions) as PolicyAction[], [
            { bucket: bucketName, object: `${prefix}*` },
          ])
        );
      }
  }

  // 合并策略
  return appendStatements(filteredStatements, newStatements);
}
