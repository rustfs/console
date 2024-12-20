export const useUsers = () => {
  const { $api } = useNuxtApp();

  /**
   * List all users
   *
   * @returns
   */
  const ListUsers = async () => {
    return await $api.get('/users');
  };

  const addUser = async (data: any) => {
    return await $api.post('/users', data);
  };

  const getUserInfo = async (name: string) => {
    return await $api.get(`/user/${encodeURIComponent(name)}`);
  };

  const updateUserInfo = async (name: string, data: any) => {
    return await $api.put(`/user/${encodeURIComponent(name)}`, data);
  };

  const deleteUser = async (name: string) => {
    return await $api.delete(`/user/${encodeURIComponent(name)}`, {});
  };

  const updateUserGroups = async (name: string, data: any) => {
    return await $api.put(`/user/${encodeURIComponent(name)}/groups`, data);
  };

  const getUserPolicy = async () => {
    return await $api.get(`/user/policy`);
  };

  const getSaUserPolicy = async (name: string) => {
    return await $api.get(`/user/${encodeURIComponent(name)}/policies`);
  };

  const listAUserServiceAccounts = async (name: string) => {
    return await $api.get(`/user/${encodeURIComponent(name)}/service-accounts`);
  };

  const createAUserServiceAccount = async (name: string, data: any) => {
    return await $api.post(`/user/${encodeURIComponent(name)}/service-accounts`, data);
  };

  const createServiceAccountCredentials = async (name: string, data: any) => {
    return await $api.post(`/user/${encodeURIComponent(name)}/service-account-credentials`, data);
  };

  return {
    ListUsers,
    addUser,
    getUserInfo,
    deleteUser,
    updateUserInfo,
    updateUserGroups,
    getUserPolicy,
    getSaUserPolicy,
    listAUserServiceAccounts,
    createAUserServiceAccount,
    createServiceAccountCredentials,
  };
};
