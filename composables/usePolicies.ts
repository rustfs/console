export const usePolicies = () => {
  const { $api } = useNuxtApp()

  /**
   * 获取策略列表
   * @returns
   */
  const listPolicies = async () => {
    return await $api.get("/list-canned-policies")
  }

  /**
   * 添加策略
   * @param data
   * @returns
   */
  const addPolicy = async (data: any) => {
    return await $api.post("/add-canned-policy", data)
  }

  /**
   * 获取策略详情
   * @param policyName
   * @returns
   */
  const getPolicy = async (policyName: string) => {
    return await $api.get(`/info-canned-policy?name=${encodeURIComponent(policyName)}`)
  }

  /**
   * 获取策略用户列表
   * @param policyName
   * @returns
   */
  const listUsersForPolicy = async (policyName: string) => {
    return await $api.get(`/policy/${encodeURIComponent(policyName)}/users`)
  }

  /**
   * 获取策略组列表
   * @param policyName
   * @returns
   */
  const listGroupsForPolicy = async (policyName: string) => {
    return await $api.get(`/groups`)
  }

  /**
   * 删除策略
   * @param policyName
   * @returns
   */
  const removePolicy = async (policyName: string) => {
    return await $api.delete(`/remove-canned-policy?name=${encodeURIComponent(policyName)}`, {})
  }

  /**
   * 批量设置策略
   * @param data
   * @returns
   */
  const setPolicyMultiple = async (data: any) => {
    return await $api.put(`/set-policy-multi`, data)
  }

  /**
   * 设置用户或者用户组的策略
   * @param data
   * @returns
   */
  const setUserOrGroupPolicy = async (data: any) => {
    return await $api.put(`/set-user-or-group-policy`, {}, { params: data })
  }

  /**
   * 根据用户的名称获取策略原文
   * @param userName
   * @returns
   */
  const getPolicyByUserName = async (userName: string) => {
    // 获取用户策略组
    const userInfo = await $api.get(`/user-info?accessKey=${userName}`)
    const policyName = userInfo?.policyName?.split(",") || []

    // 获取用户所在分组
    const memberOf = userInfo?.memberOf
    // 获取分组的策略
    if (memberOf && memberOf.length > 0) {
      const promises = memberOf.map(async (element: string) => {
        const groupInfo: { policy?: string } = await $api.get(`/group?group=${encodeURIComponent(element)}`)
        const groupPolicyName: string[] = groupInfo.policy ? groupInfo.policy.split(",") : []
        return groupPolicyName
      })
      const results = await Promise.all(promises)
      results.forEach((policyNames) => {
        policyName.push(...policyNames)
      })
    }

    // 去重
    let uniquePolicyName: string[] = []
    if (policyName.length) {
      uniquePolicyName = Array.from(new Set(policyName))
    }

    let policyStatement: any = []
    // 获取所有剩余的策略策略原文
    if (uniquePolicyName.length) {
      const policyPromises = uniquePolicyName.map(async (element: any) => {
        const policyInfo = await getPolicy(element)
        // 格式化policy
        let policyRes = JSON.parse(policyInfo.policy)
        if (policyRes?.Statement) {
          policyStatement.push(...policyRes.Statement)
        }
      })
      // 等待所有的请求完成
      await Promise.all(policyPromises)
    }

    return {
      ID: "",
      Version: "2012-10-17",
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
