<script setup lang="ts">
// 如果你想使用对话框，你需要把调用其方法的组件放在 n-dialog-provider 内部并且使用 useDialog 去获取 API。
// 如果你想使用通知，你需要把调用其方法的组件放在 n-notification-provider 内部并且使用 useNotification 来获取 API。
// 如果你想使用信息，你需要把调用其方法的组件放在 n-message-provider 内部并且使用 useMessage 去获取 API。
// 如果你想使用通知，你需要把调用其方法的组件放在 n-notification-provider 内部并且使用 useNotification 来获取 API。

import { useDialog, useLoadingBar, useMessage, useNotification } from 'naive-ui'

// 挂载naive组件的方法至window, 以便在路由钩子函数和请求函数里面调用
function registerNaiveTools() {
  window.$loadingBar = useLoadingBar()
  window.$dialog = useDialog()
  window.$message = useMessage()
  window.$notification = useNotification()
}
// 脱离上下文的 API 不会受 n-xxx-provider 的影响，并且和应用上下文中对应组件会使用不同的 DOM 容器
const NaiveProviderContent = defineComponent({
  name: 'NaiveProviderContent',
  setup() {
    registerNaiveTools()
  },
  render() {
    return h('div')
  },
})
</script>

<template>
  <!-- 独立API的容器 -->
  <n-loading-bar-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <n-message-provider>
          <slot />
          <NaiveProviderContent />
        </n-message-provider>
      </n-notification-provider>
    </n-dialog-provider>
  </n-loading-bar-provider>
</template>

<style scoped></style>
