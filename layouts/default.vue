<template>
  <!-- 全局化配置设置内部组件的主题、语言。 -->
  <n-config-provider class="wh-full" inline-theme-disabled>
    <NaiveProvider>
      <n-space vertical>
        <n-layout class="h-full">
          <n-layout has-sider>
            <Sidebar />
            <div class="min-h-screen flex flex-col flex-1">
              <div class="flex-1">
                <slot />
              </div>
            </div>
          </n-layout>
        </n-layout>
      </n-space>
    </NaiveProvider>
  </n-config-provider>
</template>
<script lang="ts">
import NaiveProvider from '../components/NaiveProvider.vue';
</script>
