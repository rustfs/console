export const usePolicies = () => {
  const { $api } = useNuxtApp()

  /**
   * Get list of policies
   * @returns List of policies
   */
  const listPolicies = async () => {
    return await $api.get('/list-canned-policies')
  }

  /**
   * Add a policy
   * @param data Policy data
   * @returns Created policy
   */
  const addPolicy = async (data: any) => {
    return await $api.post('/add-canned-policy', data)
  }

  /**
   * Get policy details
   * @param policyName Policy name
   * @returns Policy details
   */
  const getPolicy = async (policyName: string) => {
    return await $api.get(`/info-canned-policy?name=${encodeURIComponent(policyName)}`)
  }

  /**
   * Get list of users for a policy
   * @param policyName Policy name
   * @returns List of users
   */
  const listUsersForPolicy = async (policyName: string) => {
    return await $api.get(`/policy/${encodeURIComponent(policyName)}/users`)
  }

  /**
   * Get list of groups for a policy
   * @param policyName Policy name
   * @returns List of groups
   */
  const listGroupsForPolicy = async (policyName: string) => {
    return await $api.get(`/groups`)
  }

  /**
   * Delete a policy
   * @param policyName Policy name
   * @returns Deletion result
   */
  const removePolicy = async (policyName: string) => {
    return await $api.delete(`/remove-canned-policy?name=${encodeURIComponent(policyName)}`, {})
  }

  /**
   * Set policies in batch
   * @param data Batch policy data
   * @returns Result
   */
  const setPolicyMultiple = async (data: any) => {
    // Add basic deduplication for policy names if applicable
    // This handles common batch policy assignment patterns
    if (data.policyName && Array.isArray(data.policyName)) {
      data.policyName = Array.from(new Set(data.policyName))
    }
    // Handle potential different structure where policies might be in a 'policies' array
    if (data.policies && Array.isArray(data.policies)) {
      // If policies array contains objects with policyName, deduplicate based on policyName
      const policyNameMap = new Map()
      data.policies.forEach((policy: any) => {
        if (policy.policyName && !policyNameMap.has(policy.policyName)) {
          policyNameMap.set(policy.policyName, policy)
        }
      })
      data.policies = Array.from(policyNameMap.values())
    }
    return await $api.put(`/set-policy-multi`, data)
  }

  /**
   * Set policy for user or user group
   * @param data Policy assignment data
   * @returns Result
   */
  const setUserOrGroupPolicy = async (data: any) => {
    // Ensure policy names are unique before sending to API
    if (data.policyName && Array.isArray(data.policyName)) {
      data.policyName = Array.from(new Set(data.policyName))
    }
    return await $api.put(`/set-user-or-group-policy`, {}, { params: data })
  }

  /**
   * Get policy document by user name
   * @param userName User name
   * @returns Policy document
   */
  const getPolicyByUserName = async (userName: string) => {
    // Get user policy groups
    const userInfo = await $api.get(`/user-info?accessKey=${userName}`)
    const directPolicyNames = userInfo?.policyName?.split(',') || []

    // Get user's group memberships
    const memberOf = userInfo?.memberOf || []
    // Get group policies
    const groupPoliciesMap: Record<string, string[]> = {}
    if (memberOf.length > 0) {
      const promises = memberOf.map(async (groupName: string) => {
        const groupInfo: { policy?: string } = await $api.get(`/group?group=${encodeURIComponent(groupName)}`)
        const groupPolicyNames: string[] = groupInfo.policy ? groupInfo.policy.split(',') : []
        if (groupPolicyNames.length > 0) {
          groupPoliciesMap[groupName] = groupPolicyNames
        }
      })
      await Promise.all(promises)
    }

    // Collect all unique policy names
    const allPolicyNames = new Set<string>()
    directPolicyNames.forEach((policyName: string) => allPolicyNames.add(policyName))
    Object.values(groupPoliciesMap).forEach((policyNames: string[]) => {
      policyNames.forEach((policyName: string) => allPolicyNames.add(policyName))
    })

    let policyStatement: any = []
    // Get all policy documents
    if (allPolicyNames.size > 0) {
      const policyPromises = Array.from(allPolicyNames).map(async (policyName: string) => {
        const policyInfo = await getPolicy(policyName)
        // Format policy
        let policyRes = JSON.parse(policyInfo.policy)
        if (policyRes?.Statement) {
          // Add origin information to each statement
          policyRes.Statement = policyRes.Statement.map((statement: any) => {
            // Check if this policy is direct or inherited from groups
            const isDirect = directPolicyNames.includes(policyName)
            const groupOrigins = Object.entries(groupPoliciesMap)
              .filter(([_, policies]) => policies.includes(policyName))
              .map(([groupName]) => groupName)

            return {
              ...statement,
              Sid: statement.Sid || policyName, // Use policy name as Sid if not provided
              Origin: {
                type: isDirect && groupOrigins.length > 0 ? 'both' : isDirect ? 'direct' : 'group',
                groups: groupOrigins,
                policyName: policyName,
              },
            }
          })
          policyStatement.push(...policyRes.Statement)
        }
      })
      // Wait for all requests to complete
      await Promise.all(policyPromises)
    }

    return {
      ID: '',
      Version: '2012-10-17',
      Statement: policyStatement,
    }
  }

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
  }
}
