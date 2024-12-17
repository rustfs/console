const { $api } = useNuxtApp();
export const useGroups = () => {
  /**
   * Get all groups
   *
   * @returns
   */
  const groupList = async () => {
    return await $api.get('/groups');
  };

  /**
   * get group info
   * @param name
   * @returns
   */
  const getGroupInfo = async (name: string) => {
    return await $api.get(`/group/${encodeURIComponent(name)}`);
  };

  /**
   * add group
   * @param data
   * @returns
   */
  const groupAdd = async (data: any) => {
    return await $api.post('/groups', data);
  };

  /**
   * delete group
   * @param name
   * @returns
   */
  const groupDelete = async (name: string) => {
    return await $api.delete(`/group/${encodeURIComponent(name)}`, {});
  };

  /**
   * update group
   * @param name
   * @param data
   * @returns
   */
  const groupUpdate = async (name: string, data: any) => {
    return await $api.put(`/group/${encodeURIComponent(name)}`, data);
  };

  return {
    groupList,
    getGroupInfo,
    groupAdd,
    groupDelete,
    groupUpdate,
  };
};
