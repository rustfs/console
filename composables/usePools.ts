export const usePools = () => {
  const { $api } = useNuxtApp()
  return {
    // 存储池列表
    async getPoolsList() {
      return await $api.get('/pools/list')
    },

    // 存储池状态
    async getPoolsStatus() {
      return await $api.get('/pools/status')
    },
    // 存储池下线
    async offlinePool(pool: string) {
      return await $api.post('/pools/decommission', { pool })
    },

    //  取消下线
    async cancelOfflinePool(pool: string) {
      return await $api.post('/pools/cancel', { pool })
    },
  }
}
