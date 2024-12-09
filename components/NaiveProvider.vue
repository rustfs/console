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

<script setup lang="ts">
const NaiveProviderContent = defineComponent({
  name: 'NaiveProviderContent',
  setup() {},
  render() {
    return h('div');
  },
});
</script>

<style scoped></style>
