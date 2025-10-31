export const usePolicies = () => {
  const { $api } = useNuxtApp();

  /**
   * Get list of policies
   * @returns List of policies
   */
  const listPolicies = async () => {
    return await $api.get('/list-canned-policies');
  };

  /**
   * Add a policy
   * @param data Policy data
   * @returns Created policy
   */
  const addPolicy = async (data: any) => {
    return await $api.post('/add-canned-policy', data);
  };

  /**
   * Get policy details
   * @param policyName Policy name
   * @returns Policy details
   */
  const getPolicy = async (policyName: string) => {
    return await $api.get(`/info-canned-policy?name=${encodeURIComponent(policyName)}`);
  };

  /**
   * Get list of users for a policy
   * @param policyName Policy name
   * @returns List of users
   */
  const listUsersForPolicy = async (policyName: string) => {
    return await $api.get(`/policy/${encodeURIComponent(policyName)}/users`);
  };

  /**
   * Get list of groups for a policy
   * @param policyName Policy name
   * @returns List of groups
   */
  const listGroupsForPolicy = async (policyName: string) => {
    return await $api.get(`/groups`);
  };

  /**
   * Delete a policy
   * @param policyName Policy name
   * @returns Deletion result
   */
  const removePolicy = async (policyName: string) => {
    return await $api.delete(`/remove-canned-policy?name=${encodeURIComponent(policyName)}`, {});
  };

  /**
   * Set policies in batch
   * @param data Batch policy data
   * @returns Result
   */
  const setPolicyMultiple = async (data: any) => {
    return await $api.put(`/set-policy-multi`, data);
  };

  /**
   * Set policy for user or user group
   * @param data Policy assignment data
   * @returns Result
   */
  const setUserOrGroupPolicy = async (data: any) => {
    return await $api.put(`/set-user-or-group-policy`, {}, { params: data });
  };

  /**
   * Get policy document by user name
   * @param userName User name
   * @returns Policy document
   */
  const getPolicyByUserName = async (userName: string) => {
    // Get user policy groups
    const userInfo = await $api.get(`/user-info?accessKey=${userName}`);
    const policyName = userInfo?.policyName?.split(',') || [];

    // Get user's group memberships
    const memberOf = userInfo?.memberOf;
    // Get group policies
    if (memberOf && memberOf.length > 0) {
      const promises = memberOf.map(async (element: string) => {
        const groupInfo: { policy?: string } = await $api.get(`/group?group=${encodeURIComponent(element)}`);
        const groupPolicyName: string[] = groupInfo.policy ? groupInfo.policy.split(',') : [];
        return groupPolicyName;
      });
      const results = await Promise.all(promises);
      results.forEach(policyNames => {
        policyName.push(...policyNames);
      });
    }

    // Remove duplicates
    let uniquePolicyName: string[] = [];
    if (policyName.length) {
      uniquePolicyName = Array.from(new Set(policyName));
    }

    let policyStatement: any = [];
    // Get all remaining policy documents
    if (uniquePolicyName.length) {
      const policyPromises = uniquePolicyName.map(async (element: any) => {
        const policyInfo = await getPolicy(element);
        // Format policy
        let policyRes = JSON.parse(policyInfo.policy);
        if (policyRes?.Statement) {
          policyStatement.push(...policyRes.Statement);
        }
      });
      // Wait for all requests to complete
      await Promise.all(policyPromises);
    }

    return {
      ID: '',
      Version: '2012-10-17',
      Statement: policyStatement,
    };
  };

  return {
    listPolicies,
    getPolicy,
    addPolicy,
    removePolicy,
    listUsersForPolicy,
    listGroupsForPolicy,
    setPolicyMultiple,
    setUserOrGroupPolicy,
    getPolicyByUserName,
  };
};
