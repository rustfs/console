export const useGroups = () => {
  const { $api } = useNuxtApp()

  /**
   * Get all groups
   *
   * @returns
   */
  const listGroup = async () => {
    return await $api.get('/groups')
  }

  /**
   * get group info
   * @param name
   * @returns
   */
  const getGroup = async (name: string) => {
    return await $api.get(`/group?group=${encodeURIComponent(name)}`)
  }

  /**
   * add group
   * @param data
   * @returns
   */
  const createGroup = async (data: any) => {
    return await $api.post('/groups', data)
  }

  /**
   * delete group
   * @param name
   * @returns
   */
  const removeGroup = async (name: string) => {
    return await $api.delete(`/group/${encodeURIComponent(name)}`, {})
  }

  /**
   * update group
   * @param name
   * @param data
   * @returns
   */
  const updateGroup = async (name: string, data: any) => {
    return await $api.put(`/group/${encodeURIComponent(name)}`, data)
  }

  /**
   * @desc 修改用户组的状态
   * @param name
   * @param data
   * @returns
   */
  const updateGroupStatus = async (name: string, data: any) => {
    return await $api.put(`/set-group-status?group=${encodeURIComponent(name)}&status=${data.status}`, data)
  }

  /**
   * #desc 修改用户组的成员
   * @param name
   * @param data  isRemove true 移除
   * @returns
   */
  const updateGroupMembers = async (data: any) => {
    return await $api.put(`/update-group-members`, data)
  }

  return {
    listGroup,
    getGroup,
    createGroup,
    removeGroup,
    updateGroup,
    updateGroupStatus,
    updateGroupMembers,
  }
}
