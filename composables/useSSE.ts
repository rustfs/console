export const useSSE = () => {
  const { $api } = useNuxtApp();
  return {
    // 获取KMS的状态
    async getKMSStatus() {
      return await $api.get('/kms/status');
    },

    // 配置KMS
    async configureKMS(data: any) {
      return await $api.post('/kms/configure', data);
    },

    // 获取配置
    async getConfiguration() {
      return await $api.get('/kms/config');
    },

    // 创建秘钥
    async createKey(data: any) {
      return await $api.post('/kms/key/create', {}, { params: data });
    },

    // 启用秘钥
    async enableKey(keyName: string) {
      return await $api.put('/kms/key/enable', {}, { params: { keyName } });
    },

    // 禁用秘钥
    async disableKey(keyName: string) {
      return await $api.put('/kms/key/disable', {}, { params: { keyName } });
    },

    // 获取秘钥状态
    async getKeyStatus(params: any) {
      return await $api.get('/kms/key/status', { params: params });
    },

    // 获取秘钥列表
    async getKeyList() {
      return await $api.get('/kms/key/list');
    },

    // 删除秘钥
    async deleteKey(keyName: string) {
      return await $api.delete('/kms/key/delete', { params: { keyName } });
    },
  };
};
