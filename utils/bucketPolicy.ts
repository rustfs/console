type BucketPolicy = 'none' | 'readonly' | 'readwrite' | 'writeonly';

const BucketPolicyConstants = {
    None: 'none' as BucketPolicy,
    ReadOnly: 'readonly' as BucketPolicy,
    ReadWrite: 'readwrite' as BucketPolicy,
    WriteOnly: 'writeonly' as BucketPolicy,
};

const awsResourcePrefix = 'arn:aws:s3:::';

const commonBucketActions = new Set<string>(['s3:GetBucketLocation']);
const readOnlyBucketActions = new Set<string>(['s3:ListBucket']);
const writeOnlyBucketActions = new Set<string>(['s3:ListBucketMultipartUploads']);
const readOnlyObjectActions = new Set<string>(['s3:GetObject']);
const writeOnlyObjectActions = new Set<string>(['s3:AbortMultipartUpload', 's3:DeleteObject', 's3:ListMultipartUploadParts', 's3:PutObject']);
const readWriteObjectActions = new Set([...readOnlyObjectActions, ...writeOnlyObjectActions]);

const validActions = new Set([
    ...Array.from(commonBucketActions),
    ...Array.from(readOnlyBucketActions),
    ...Array.from(writeOnlyBucketActions),
    ...Array.from(readOnlyObjectActions),
    ...Array.from(writeOnlyObjectActions),
]);



interface User {
    AWS?: Set<string>;
    CanonicalUser?: Set<string>;
}

class Statement {
    Actions: Set<string>;
    Conditions?: Record<string, any>;
    Effect: string;
    Principal: User;
    Resources: Set<string>;
    Sid?: string;

    constructor(actions: Set<string>, effect: string, principal: User, resources: Set<string>, conditions?: Record<string, any>, sid?: string) {
        this.Actions = actions;
        this.Effect = effect;
        this.Principal = principal;
        this.Resources = resources;
        this.Conditions = conditions;
        this.Sid = sid;
    }
}

class BucketAccessPolicy {
    Version: string;
    Statements: Statement[];

    constructor(version: string, statements: Statement[]) {
        this.Version = version;
        this.Statements = statements;
    }
}

export function isValidStatement(statement: Statement, bucketName: string): boolean {
    if (Array.from(statement.Actions).every(action => !validActions.has(action))) {
        return false;
    }

    if (statement.Effect !== 'Allow') {
        return false;
    }

    if (!statement.Principal.AWS || !statement.Principal.AWS.has('*')) {
        return false;
    }

    const bucketResource = `${awsResourcePrefix}${bucketName}`;
    if (statement.Resources.has(bucketResource)) {
        return true;
    }

    if (Array.from(statement.Resources).some(resource => resource.startsWith(bucketResource + '/'))) {
        return true;
    }

    return false;
}

export function newBucketStatement(policy: BucketPolicy, bucketName: string, prefix: string): Statement[] {
    const statements: Statement[] = [];
    if (policy === BucketPolicyConstants.None || bucketName === '') {
        return statements;
    }

    const bucketResource = new Set([`${awsResourcePrefix}${bucketName}`]);

    const statement1 = new Statement(commonBucketActions, 'Allow', { AWS: new Set(['*']) }, bucketResource);
    statements.push(statement1);

    if (policy === BucketPolicyConstants.ReadOnly || policy === BucketPolicyConstants.ReadWrite) {
        const statement2 = new Statement(readOnlyBucketActions, 'Allow', { AWS: new Set(['*']) }, bucketResource);
        if (prefix) {
            const conditions = { StringEquals: { 's3:prefix': new Set([prefix]) } };
            statement2.Conditions = conditions;
        }
        statements.push(statement2);
    }

    if (policy === BucketPolicyConstants.WriteOnly || policy === BucketPolicyConstants.ReadWrite) {
        const statement3 = new Statement(writeOnlyBucketActions, 'Allow', { AWS: new Set(['*']) }, bucketResource);
        statements.push(statement3);
    }

    return statements;
}

export function newObjectStatement(policy: BucketPolicy, bucketName: string, prefix: string): Statement[] {
    const statements: Statement[] = [];
    if (policy === BucketPolicyConstants.None || bucketName === '') {
        return statements;
    }

    const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`;
    const statement = new Statement(new Set(), 'Allow', { AWS: new Set(['*']) }, new Set([objectResource]));

    if (policy === BucketPolicyConstants.ReadOnly) {
        statement.Actions = readOnlyObjectActions;
    } else if (policy === BucketPolicyConstants.WriteOnly) {
        statement.Actions = writeOnlyObjectActions;
    } else if (policy === BucketPolicyConstants.ReadWrite) {
        statement.Actions = readWriteObjectActions;
    }

    statements.push(statement);
    return statements;
}

export function newStatements(policy: BucketPolicy, bucketName: string, prefix: string): Statement[] {
    const statements: Statement[] = [];
    const bucketStatements = newBucketStatement(policy, bucketName, prefix);
    statements.push(...bucketStatements);

    const objectStatements = newObjectStatement(policy, bucketName, prefix);
    statements.push(...objectStatements);

    return statements;
}

export function getInUsePolicy(statements: Statement[], bucketName: string, prefix: string): [boolean, boolean] {
    const resourcePrefix = `${awsResourcePrefix}${bucketName}/`;
    const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`;

    let readOnlyInUse = false;
    let writeOnlyInUse = false;

    for (const statement of statements) {
        if (!isValidStatement(statement, bucketName)) {
            continue;
        }

        if (statement.Resources.has(objectResource)) {
            const [readOnly, writeOnly] = getObjectPolicy(statement);
            readOnlyInUse = readOnlyInUse || readOnly;
            writeOnlyInUse = writeOnlyInUse || writeOnly;
        }

        if (Array.from(statement.Resources).some(resource => resource.startsWith(resourcePrefix))) {
            if (Array.from(statement.Actions).every(action => writeOnlyBucketActions.has(action))) {
                writeOnlyInUse = true;
            }
            if (Array.from(statement.Actions).every(action => readOnlyBucketActions.has(action))) {
                readOnlyInUse = true;
            }
        }

        if (readOnlyInUse && writeOnlyInUse) {
            break;
        }
    }

    return [readOnlyInUse, writeOnlyInUse];
}

export function removeObjectActions(statement: Statement, objectResource: string): Statement {
    if (!statement.Conditions) {
        if (statement.Resources.size > 1) {
            statement.Resources.delete(objectResource);
        } else {
            statement.Actions = new Set([...statement.Actions].filter(action => !readOnlyObjectActions.has(action) && !writeOnlyObjectActions.has(action)));
        }
    }

    return statement;
}

export function removeBucketActions(statement: Statement, prefix: string, bucketResource: string, readOnlyInUse: boolean, writeOnlyInUse: boolean): Statement {
    const removeReadOnly = () => {
        if (!Array.from(statement.Actions).some(action => readOnlyBucketActions.has(action))) {
            return;
        }

        if (!statement.Conditions) {
            statement.Actions = new Set([...statement.Actions].filter(action => !readOnlyBucketActions.has(action)));
            return;
        }

        if (prefix) {
            const stringEqualsValue = statement.Conditions['StringEquals'];
            const values = stringEqualsValue ? stringEqualsValue['s3:prefix'] || new Set() : new Set();

            values.delete(prefix);

            if (stringEqualsValue) {
                if (values.size === 0) {
                    delete stringEqualsValue['s3:prefix'];
                }
                if (Object.keys(stringEqualsValue).length === 0) {
                    delete statement.Conditions['StringEquals'];
                }
            }

            if (Object.keys(statement.Conditions).length === 0) {
                statement.Conditions = undefined;
                statement.Actions = new Set([...statement.Actions].filter(action => !readOnlyBucketActions.has(action)));
            }
        }
    };

    const removeWriteOnly = () => {
        if (!statement.Conditions) {
            statement.Actions = new Set([...statement.Actions].filter(action => !writeOnlyBucketActions.has(action)));
        }
    };

    if (statement.Resources.size > 1) {
        statement.Resources.delete(bucketResource);
    } else {
        if (!readOnlyInUse) {
            removeReadOnly();
        }

        if (!writeOnlyInUse) {
            removeWriteOnly();
        }
    }

    return statement;
}

export function removeStatements(statements: Statement[], bucketName: string, prefix: string): Statement[] {
    const bucketResource = `${awsResourcePrefix}${bucketName}`;
    const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`;
    const [readOnlyInUse, writeOnlyInUse] = getInUsePolicy(statements, bucketName, prefix);

    const out: Statement[] = [];
    const readOnlyBucketStatements: Statement[] = [];
    const s3PrefixValues = new Set();

    for (let statement of statements) {
        if (!isValidStatement(statement, bucketName)) {
            out.push(statement);
            continue;
        }
                       


        if (statement.Resources.has(bucketResource)) {
            if (statement.Conditions) {
                statement = removeBucketActions(statement, prefix, bucketResource, false, false);
            } else {
                statement = removeBucketActions(statement, prefix, bucketResource, readOnlyInUse, writeOnlyInUse);
            }
        } else if (statement.Resources.has(objectResource)) {
            statement = removeObjectActions(statement, objectResource);
        }

        if (statement.Actions.size > 0) {

            if (statement.Resources.has(bucketResource) &&
                Array.from(statement.Actions).every(action => commonBucketActions.has(action)) &&
                statement.Effect === 'Allow' &&
                statement.Principal.AWS?.has('*')) {

                if (statement.Conditions) {
                    const stringEqualsValue = statement.Conditions['StringEquals'];
                    const values = stringEqualsValue ? stringEqualsValue['s3:prefix'] || new Set() : new Set();

                    if (values.size > 0) {
                        for (const value of values) {
                            s3PrefixValues.add(`${bucketResource}/${value}*`);
                        }
                    }
                    // s3PrefixValues.add(...Array.from(values).map(v => `${bucketResource}/${v}*`));
                } else if (prefix === '') {
                    readOnlyBucketStatements.push(statement);
                    continue;
                }
            }
            out.push(statement);
        }
    }

    let skipBucketStatement = true;
    const resourcePrefix = `${awsResourcePrefix}${bucketName}/`;
    for (const statement of out) {
        if (Array.from(statement.Resources).some(resource => resource.startsWith(resourcePrefix)) &&
            Array.from(s3PrefixValues).every(resource => !statement.Resources.has(resource as string))) { // 明确类型转换
            skipBucketStatement = false;
            break;
        }
    }

    for (const statement of readOnlyBucketStatements) {
        if (skipBucketStatement &&
            statement.Resources.has(bucketResource) &&
            statement.Effect === 'Allow' &&
            statement.Principal.AWS?.has('*') &&
            !statement.Conditions) {
            continue;
        }

        out.push(statement);
    }

    if (out.length === 1) {
        const statement = out[0];
        if (statement.Resources.has(bucketResource) &&
            Array.from(statement.Actions).every(action => commonBucketActions.has(action)) &&
            statement.Effect === 'Allow' &&
            statement.Principal.AWS?.has('*') &&
            !statement.Conditions) {
            return [];
        }
    }

    return out;
}
/*
export function appendStatement(statements: Statement[], statement: Statement): Statement[] {
    for (let i = 0; i < statements.length; i++) {
        const s = statements[i];
        if (s.Actions.size === statement.Actions.size &&
            s.Effect === statement.Effect &&
            s.Principal.AWS?.has('*') &&
            JSON.stringify(s.Conditions) === JSON.stringify(statement.Conditions)) {
            s.Resources = new Set([...s.Resources, ...statement.Resources]);
            return statements;
        } else if (s.Resources.size === statement.Resources.size &&
            s.Effect === statement.Effect &&
            s.Principal.AWS?.has('*') &&
            JSON.stringify(s.Conditions) === JSON.stringify(statement.Conditions)) {
            s.Actions = new Set([...s.Actions, ...statement.Actions]);
            return statements;
        }

        if (Array.from(s.Resources).some(resource => Array.from(statement.Resources).includes(resource)) &&
            Array.from(s.Actions).some(action => Array.from(statement.Actions).includes(action)) &&
            s.Effect === statement.Effect &&
            Array.from(s.Principal.AWS || []).some(principal => Array.from(statement.Principal.AWS || []).includes(principal))) {
            if (JSON.stringify(s.Conditions) === JSON.stringify(statement.Conditions)) {
                return statements;
            }
            if (s.Conditions && statement.Conditions) {
                if (areSetsEqual(new Set(Array.from(s.Resources)), new Set(Array.from(statement.Resources)))) {
                    s.Conditions = { ...s.Conditions, ...statement.Conditions };
                    return statements;
                }
            }
        }
    }

    if (!(statement.Actions.size === 0 && statement.Resources.size === 0)) {
        return [...statements, statement];
    }

    return statements;
}
*/

function appendStatement(statements: Statement[], statement: Statement): Statement[] {
    for (let i = 0; i < statements.length; i++) {
        const s = statements[i];
        
        // 第一个合并条件
        if (areSetsEqual(s.Actions, statement.Actions) &&
            s.Effect === statement.Effect &&
            areSetsEqual(s.Principal.AWS, statement.Principal.AWS) &&
            deepEqual(s.Conditions, statement.Conditions)) {
            
            statements[i].Resources = new Set([...s.Resources, ...statement.Resources]);
            return statements;
        } 
        // 第二个合并条件
        else if (areSetsEqual(s.Resources, statement.Resources) &&
            s.Effect === statement.Effect &&
            areSetsEqual(s.Principal.AWS, statement.Principal.AWS) &&
            deepEqual(s.Conditions, statement.Conditions)) {
            
            statements[i].Actions = new Set([...s.Actions, ...statement.Actions]);
            return statements;
        }

        // 处理交集条件
        const resourceIntersection = setIntersection(s.Resources, statement.Resources);
        const actionIntersection = setIntersection(s.Actions, statement.Actions);
        const principalIntersection = setIntersection(s.Principal.AWS  as Set<string>, statement.Principal.AWS  as Set<string>);
        
        if (areSetsEqual(resourceIntersection, statement.Resources) &&
            areSetsEqual(actionIntersection, statement.Actions) &&
            s.Effect === statement.Effect &&
            areSetsEqual(principalIntersection, statement.Principal.AWS)) {
            
            if (deepEqual(s.Conditions, statement.Conditions)) {
                return statements;
            }
            
            if (s.Conditions && statement.Conditions) {
                if (areSetsEqual(s.Resources, statement.Resources)) {
                    statements[i].Conditions = mergeConditionMap(s.Conditions, statement.Conditions);
                    return statements;
                }
            }
        }
    }

    if (!(statement.Actions.size === 0 && statement.Resources.size === 0)) {
        return [...statements, statement];
    }

    return statements;
}


function setUnion<T>(...sets: Set<T>[]): Set<T> {
    return new Set(sets.flatMap(set => [...set]));
}

function setIntersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    return new Set([...setA].filter(x => setB.has(x)));
}

// 其他辅助函数保持与之前相同
function deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
interface Condition {
    [key: string]: { [key: string]: string | string[] };
}
function mergeConditionMap(a: Condition, b: Condition): Condition {
    const merged: Condition = { ...a };
    for (const [key, value] of Object.entries(b)) {
        merged[key] = { ...merged[key], ...value };
    }
    return merged;
}
export function areSetsEqual(set1: any, set2: any): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
        if (!set2.has(item)) return false;
    }
    return true;
}

export function appendStatements(statements: Statement[], appendStatements: Statement[]): Statement[] {
    for (const s of appendStatements) {
        statements = appendStatement(statements, s);
    }
        console.log("🚀 ~ appendStatements ~ statements:", statements)

    return statements;
}

export function getBucketPolicy(statement: Statement, prefix: string): [boolean, boolean, boolean] {
    if (!(statement.Effect === 'Allow' && statement.Principal.AWS?.has('*'))) {
        return [false, false, false];
    }

    const commonFound = Array.from(statement.Actions).every(action => commonBucketActions.has(action)) && !statement.Conditions;
    const writeOnly = Array.from(statement.Actions).every(action => writeOnlyBucketActions.has(action)) && !statement.Conditions;
    let readOnly = false;

    if (Array.from(statement.Actions).every(action => readOnlyBucketActions.has(action))) {
        if (prefix && statement.Conditions) {
            const stringEqualsValue = statement.Conditions['StringEquals'];
            const values = stringEqualsValue ? stringEqualsValue['s3:prefix'] || new Set() : new Set();
            if (values.has(prefix)) {
                readOnly = true;
            }
        } else if (!prefix && !statement.Conditions) {
            readOnly = true;
        } else if (prefix && !statement.Conditions) {
            readOnly = true;
        }
    }

    return [commonFound, readOnly, writeOnly];
}

export function getObjectPolicy(statement: Statement): [boolean, boolean] {
    if (statement.Effect === 'Allow' && statement.Principal.AWS?.has('*') && !statement.Conditions) {
        const readOnly = Array.from(statement.Actions).every(action => readOnlyObjectActions.has(action));
        const writeOnly = Array.from(statement.Actions).every(action => writeOnlyObjectActions.has(action));
        return [readOnly, writeOnly];
    }
    return [false, false];
}

export function getPolicy(statements: Statement[], bucketName: string, prefix: string): BucketPolicy {
    const bucketResource = `${awsResourcePrefix}${bucketName}`;
    const objectResource = `${awsResourcePrefix}${bucketName}/${prefix}*`;

    let bucketCommonFound = false;
    let bucketReadOnly = false;
    let bucketWriteOnly = false;
    let matchedResource = '';
    let objReadOnly = false;
    let objWriteOnly = false;

    for (const s of statements) {
        const matchedObjResources = new Set<string>();

        if (s.Resources.has(objectResource)) {
            matchedObjResources.add(objectResource);
        } else {
            for (const resource of Array.from(s.Resources)) {
                if (resource.startsWith(objectResource)) {
                    matchedObjResources.add(resource);
                }
            }
        }

        if (matchedObjResources.size > 0) {
            const [readOnly, writeOnly] = getObjectPolicy(s);
            for (const resource of matchedObjResources) {
                if (matchedResource.length < resource.length) {
                    objReadOnly = readOnly;
                    objWriteOnly = writeOnly;
                    matchedResource = resource;
                } else if (matchedResource.length === resource.length) {
                    objReadOnly = objReadOnly || readOnly;
                    objWriteOnly = objWriteOnly || writeOnly;
                    matchedResource = resource;
                }
            }
        }

        if (s.Resources.has(bucketResource)) {
            const [commonFound, readOnly, writeOnly] = getBucketPolicy(s, prefix);
            console.log("🚀 ~ getPolicy ~ commonFound, readOnly, writeOnly:", commonFound, readOnly, writeOnly)
            bucketCommonFound = bucketCommonFound || commonFound;
            bucketReadOnly = bucketReadOnly || readOnly;
            bucketWriteOnly = bucketWriteOnly || writeOnly;
        }
    }

    let policy: BucketPolicy = BucketPolicyConstants.None;
        console.log("🚀 ~ getPolicy ~ bucketCommonFound:", bucketCommonFound)

    if (bucketCommonFound) {
        if (bucketReadOnly && bucketWriteOnly && objReadOnly && objWriteOnly) {
            policy = BucketPolicyConstants.ReadWrite;
        } else if (bucketReadOnly && objReadOnly) {
            policy = BucketPolicyConstants.ReadOnly;
        } else if (bucketWriteOnly && objWriteOnly) {
            policy = BucketPolicyConstants.WriteOnly;
        }
    }

    return policy;
}

export function getPolicies(statements: Statement[], bucketName: string, prefix: string): Record<string, BucketPolicy> {
    const policyRules: Record<string, BucketPolicy> = {};
    const objResources = new Set<string>();

    for (const s of statements) {
        for (const r of Array.from(s.Resources)) {
            if (r.startsWith(`${awsResourcePrefix}${bucketName}/${prefix}`)) {
                objResources.add(r);
            }
        }
    }

    for (const r of objResources) {
        let asterisk = '';
        if (r.endsWith('*')) {
            asterisk = '*';
        }
        let objectPath = r.replace(`${awsResourcePrefix}${bucketName}/`, '');
        if (asterisk) {
            objectPath = objectPath.slice(0, -1);
        }
        const p = getPolicy(statements, bucketName, objectPath);
        policyRules[`${bucketName}/${objectPath}${asterisk}`] = p;
    }

    return policyRules;
}

export function setPolicy(statements: Statement[], policy: BucketPolicy, bucketName: string, prefix: string): Statement[] {
    const out = removeStatements(statements, bucketName, prefix);
    const ns = newStatements(policy, bucketName, prefix);
    return appendStatements(out, ns);
}

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
