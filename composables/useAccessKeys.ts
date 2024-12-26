export const useAccessKeys = () => {
  const { $api } = useNuxtApp();

  const listUserServiceAccounts = async () => {
    return await $api.get('/service-accounts');
  };

  const createServiceAccount = async (data: any) => {
    return await $api.post('/service-accounts', data);
  };

  const deleteMultipleServiceAccounts = async (data: any) => {
    return await $api.delete('/service-accounts/delete-multi', data);
  };

  const getServiceAccount = async (name: string) => {
    return await $api.get(`/service-accounts/${encodeURIComponent(name)}`);
  };

  const updateServiceAccount = async (name: string, data: any) => {
    return await $api.put(`/service-accounts/${encodeURIComponent(name)}`, data);
  };

  const deleteServiceAccount = async (name: string) => {
    return await $api.delete(`/service-accounts/${encodeURIComponent(name)}`, {});
  };

  const createServiceAccountCreds = async (data: any) => {
    return await $api.post(`/service-account-credentials`, data);
  };

  return {
    listUserServiceAccounts,
    createServiceAccount,
    deleteServiceAccount,
    createServiceAccountCreds,
    updateServiceAccount,
    getServiceAccount,
    deleteMultipleServiceAccounts,
  };
};
