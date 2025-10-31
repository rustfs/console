export const useTiers = () => {
  const { $api } = useNuxtApp()
  /**
   * 添加分层
   *
   *'{"type":"minio","minio":{"name":"COLDTIER","endpoint":"","bucket":"","prefix":"","region":"","accesskey":"","secretkey":""}}'
   * {"type":"rustfs","rustfs":{"name":"COLDTIER","endpoint":"","bucket":"","prefix":"","region":"","accesskey":"","secretkey":""}}
   * {"type":"s3","s3":{"name":"S3COLDTIER","endpoint":"","bucket":"","prefix":"","region":"","accesskey":"","secretkey":"","storageclass":"STANDAR
   *
   */
  const addTiers = async (data: any) => {
    return await $api.put('/tier?force=false', data)
  }

  /**
   * 编辑分层
   * @returns
   */
  const updateTiers = async (name: string, data: any) => {
    return await $api.post(`/tier/${encodeURIComponent(name)}`, data)
  }

  /**
   * 获取分层列表
   * @returns
   */
  const listTiers = async () => {
    return await $api.get('/tier')
  }

  /**
   * 删除分层列表
   * @returns
   */
  const removeTiers = async (name: string) => {
    return await $api.delete(`/tier/${encodeURIComponent(name)}?force=true`, {})
  }

  return {
    addTiers,
    updateTiers,
    listTiers,
    removeTiers,
  }
}
