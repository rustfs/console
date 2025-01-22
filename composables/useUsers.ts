import { AccessKeys } from "./../.nuxt/components.d"
export const useUsers = () => {
  const { $api } = useNuxtApp()

  /**
   * List all users
   *
   * @returns
   */
  const listUsers = async () => {
    return await $api.get("/list-users")
  }

  const createUser = async (data: any) => {
    const { accessKey } = data
    delete data.accessKey
    return await $api.put("/add-user" + `?accessKey=${encodeURIComponent(accessKey)}`, data)
  }

  const getUser = async (name: string) => {
    return await $api.get(`/user/${encodeURIComponent(name)}`)
  }

  const updateUser = async (name: string, data: any) => {
    return await $api.put(`/user/${encodeURIComponent(name)}`, data)
  }

  const deleteUser = async (name: string) => {
    return await $api.delete(`/user/${encodeURIComponent(name)}`, {})
  }

  const updateUserGroups = async (name: string, data: any) => {
    return await $api.put(`/user/${encodeURIComponent(name)}/groups`, data)
  }

  const getUserPolicy = async () => {
    return await $api.get(`/user/policy`)
  }

  const getSaUserPolicy = async (name: string) => {
    return await $api.get(`/user/${encodeURIComponent(name)}/policies`)
  }

  /**
    data{
    name: string[]; //policy name
    entityType: PolicyEntity; //user or group
    entityName: string; //user name or group name
  }
   * @returns
   */
  const setPolicy = async (data: any) => {
    return await $api.put(`/set-policy`, data)
  }
  const listAllUserServiceAccounts = async (name: string) => {
    return await $api.get(`/user/${encodeURIComponent(name)}/service-accounts`)
  }

  const createAUserServiceAccount = async (name: string, data: any) => {
    return await $api.post(`/user/${encodeURIComponent(name)}/service-accounts`, data)
  }

  const createServiceAccountCredentials = async (name: string, data: any) => {
    return await $api.post(`/user/${encodeURIComponent(name)}/service-account-credentials`, data)
  }

  return {
    listUsers,
    createUser,
    getUser,
    deleteUser,
    updateUser,
    updateUserGroups,
    getUserPolicy,
    setPolicy,
    getSaUserPolicy,
    listAllUserServiceAccounts,
    createAUserServiceAccount,
    createServiceAccountCredentials,
  }
}
