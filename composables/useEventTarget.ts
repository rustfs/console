export const useEventTarget = () => {
  const { $api } = useNuxtApp()
  return {
    // 获取所有通知目标列表
    async getEventsTargetList() {
      return await $api.get('/target/list')
    },

    //新增或更新通知目标
    async updateEventTarget(target_type: string, target_name: string, targetData: any) {
      return await $api.put(`/target/${target_type}/${target_name}`, targetData)
    },

    // 删除通知目标
    async deleteEventTarget(target_type: string, target_name: string) {
      return await $api.delete(`/target/${target_type}/${target_name}/reset`)
    },

    // 获取所有通知目标 ARN 列表
    async getEventTargetArnList() {
      return await $api.get('/target/arns')
    },
  }
}
