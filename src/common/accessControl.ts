import get from 'lodash/get';
import { IAM_SCOPES } from './permissions';
import useStore from '@/store';
const hasPermission = (
  resource: string | string[] | undefined,
  scopes: string[],
  matchAll?: boolean,
  containsResource?: boolean
) => {
  if (!resource) {
    return false;
  }

  const store = useStore();
  const sessionGrants = store.permission || {};

  const globalGrants = sessionGrants['arn:aws:s3:::*'] || [];
  let resources: string[] = [];
  let resourceGrants: string[] = [];
  let containsResourceGrants: string[] = [];

  if (resource) {
    if (Array.isArray(resource)) {
      resources = [...resources, ...resource];
    } else {
      resources.push(resource);
    }

    // Filter wildcard items
    const wildcards = Object.keys(sessionGrants).filter(
      (item) => item.includes('*') && item !== 'arn:aws:s3:::*'
    );

    const getMatchingWildcards = (path: string) => {
      const items = wildcards.map((element) => {
        const wildcardItemSection = element.split(':').slice(-1)[0];

        const replaceWildcard = wildcardItemSection
          .replace('/', '\\/')
          .replace('*', '($|\\/?(.*?))');
        const inRegExp = new RegExp(`${replaceWildcard}`, 'gm');
        // Avoid calling inRegExp multiple times and instead use the stored value if need it:
        // https://stackoverflow.com/questions/59694142/regex-testvalue-returns-true-when-logged-but-false-within-an-if-statement
        const matches = inRegExp.test(path);
        if (matches) {
          return element;
        }
        return null;
      });
      return items.filter((itm) => itm !== null);
    };

    resources.forEach((rsItem) => {
      // Validation against inner paths & wildcards
      const wildcardRules = getMatchingWildcards(rsItem);

      let wildcardGrants: string[] = [];

      wildcardRules.forEach((rule) => {
        if (rule) {
          const wcResources = get(sessionGrants, rule, []);
          wildcardGrants = [...wildcardGrants, ...wcResources];
        }
      });

      let simpleResources = get(sessionGrants, rsItem, []);
      simpleResources = simpleResources || [];
      const s3Resources = get(sessionGrants, `arn:aws:s3:::${rsItem}/*`, []);
      const bucketOnly = get(sessionGrants, `arn:aws:s3:::${rsItem}/`, []);
      const bckOnlyNoSlash = get(sessionGrants, `arn:aws:s3:::${rsItem}`, []);

      resourceGrants = [
        ...simpleResources,
        ...s3Resources,
        ...wildcardGrants,
        ...bucketOnly,
        ...bckOnlyNoSlash,
      ];

      if (containsResource) {
        const matchResource = `arn:aws:s3:::${rsItem}`;

        Object.entries(sessionGrants).forEach(([key, value]) => {
          if (key.includes(matchResource)) {
            containsResourceGrants = [...containsResourceGrants, ...value];
          }
        });
      }
    });
  }

  let anyResourceGrant: string[] = [];
  const validScopes = scopes || [];
  if (resource === '*') {
    Object.entries(sessionGrants).forEach(([key, values = []]) => {
      const validValues = values || [];
      validScopes.forEach((scope) => {
        validValues.forEach((val) => {
          if (val === scope || val === 's3:*') {
            anyResourceGrant = [...anyResourceGrant, scope];
          }
        });
      });
    });
  }

  return hasAccessToResource(
    [
      ...resourceGrants,
      ...globalGrants,
      ...containsResourceGrants,
      ...anyResourceGrant,
    ],
    scopes,
    matchAll
  );
};

// hasAccessToResource receives a list of user permissions to perform on a specific resource, then compares those permissions against
// a list of required permissions and return true or false depending of the level of required access (match all permissions,
// match some of the permissions)
const hasAccessToResource = (
  userPermissionsOnBucket: string[] | null | undefined,
  requiredPermissions: string[] = [],
  matchAll?: boolean
) => {
  if (!userPermissionsOnBucket) {
    return false;
  }

  const s3All = userPermissionsOnBucket.includes(IAM_SCOPES.S3_ALL_ACTIONS);
  const AdminAll = userPermissionsOnBucket.includes(
    IAM_SCOPES.ADMIN_ALL_ACTIONS
  );

  const permissions = requiredPermissions.filter(function (n) {
    return (
      userPermissionsOnBucket.indexOf(n) !== -1 ||
      (n.indexOf('s3:') !== -1 && s3All) ||
      (n.indexOf('admin:') !== -1 && AdminAll)
    );
  });
  return matchAll
    ? permissions.length === requiredPermissions.length
    : permissions.length > 0;
};

export default hasPermission;
