<template>
  <n-space vertical>
    <n-layout class="h-full">
      <n-layout has-sider class="h-full">
        <sidebar />
        <div class="h-screen overflow-y-auto flex flex-col flex-1">
          <div class="flex-1">
            <slot />
          </div>
        </div>
      </n-layout>
    </n-layout>
  </n-space>
</template>
