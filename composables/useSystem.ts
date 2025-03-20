export const useSystem = () => {
  const { $api } = useNuxtApp()
  return {
    // 获取服务器信息
    async getSystemInfo() {
      return await $api.get("/info")
    },

    // 存储信息
    async getStorageInfo() {
      return await $api.get("/storageinfo")
    },

    // 数据使用信息
    async getDataUsageInfo() {
      return await $api.get("/datausageinfo")
    },

    // 系统指标
    async getSystemMetrics() {
      return await $api.get("/metrics")
    },
  }
}
