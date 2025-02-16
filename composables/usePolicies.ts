export const usePolicies = () => {
  const { $api } = useNuxtApp();

  /**
   * 获取策略列表
   * @returns
   */
  const listPolicies = async () => {
    return await $api.get('/list-canned-policies');
  };

  /**
   * 添加策略
   * @param data
   * @returns
   */
  const addPolicy = async (data: any) => {
    return await $api.post('/add-canned-policy', data);
  };

  /**
   * 获取策略详情
   * @param policyName
   * @returns
   */
  const getPolicy = async (policyName: string) => {
    return await $api.get(`/info-canned-policy?name=${encodeURIComponent(policyName)}`);
  };

  /**
   * 获取策略用户列表
   * @param policyName
   * @returns
   */
  const listUsersForPolicy = async (policyName: string) => {
    return await $api.get(`/policy/${encodeURIComponent(policyName)}/users`);
  };

  /**
   * 获取策略组列表
   * @param policyName
   * @returns
   */
  const listGroupsForPolicy = async (policyName: string) => {
    return await $api.get(`/groups`);
  };

  /**
   * 删除策略
   * @param policyName
   * @returns
   */
  const removePolicy = async (policyName: string) => {
    return await $api.delete(`/remove-canned-policy?name=${encodeURIComponent(policyName)}`, {});
  };

  /**
   * 批量设置策略
   * @param data
   * @returns
   */
  const setPolicyMultiple = async (data: any) => {
    return await $api.put(`/set-policy-multi`, data);
  };

  return {
    listPolicies,
    getPolicy,
    addPolicy,
    removePolicy,
    listUsersForPolicy,
    listGroupsForPolicy,
    setPolicyMultiple,
  };
};
