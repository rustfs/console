<template>
  <n-space vertical>
    <n-layout class="h-full">
      <n-layout has-sider>
        <Sidebar />
        <div class="min-h-screen flex flex-col">
          <Header />
          <div class="flex-1">
            <slot />
          </div>
          <!-- <Footer /> -->
        </div>
      </n-layout>
    </n-layout>
  </n-space>
</template>
