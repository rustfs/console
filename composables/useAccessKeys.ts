import { name } from './../node_modules/@jsep-plugin/regex/types/tsd.d'
export const useAccessKeys = () => {
  const { $api } = useNuxtApp()

  const listUserServiceAccounts = async (params: object) => {
    return await $api.get('/list-service-accounts', { params })
  }

  const createServiceAccount = async (data: any) => {
    return await $api.put('/add-service-accounts', data)
  }

  // const deleteMultipleServiceAccounts = async (data: any) => {
  //   return await $api.delete('/delete-service-accounts', data)
  // }

  const getServiceAccount = async (name: string) => {
    return await $api.get(
      `/info-service-account?accessKey=${encodeURIComponent(name)}`
    )
  }

  const updateServiceAccount = async (name: string, data: any) => {
    return await $api.post(`/update-service-account`, data)
  }

  const deleteServiceAccount = async (name: string) => {
    return await $api.delete(
      `/delete-service-accounts?accessKey==${encodeURIComponent(name)}`,
      {}
    )
  }

  const createServiceAccountCreds = async (data: any) => {
    return await $api.post(`/service-account-credentials`, data)
  }

  return {
    listUserServiceAccounts,
    createServiceAccount,
    deleteServiceAccount,
    createServiceAccountCreds,
    updateServiceAccount,
    getServiceAccount
    // deleteMultipleServiceAccounts
  }
}
