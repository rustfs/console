<template>
  <page-content class="flex flex-col gap-4 items-center justify-center min-h-screen">
    <h1 class="text-2xl font-bold">欢迎使用 RustFS.</h1>
    <div class="flex items-center justify-center">
      <n-button type="primary" @click="$router.push('/browser')">进入文件浏览器</n-button>
    </div>
    <div class="mt-4">
      <p>轻松浏览您的文件和文件夹!</p>
    </div>
  </page-content>
</template>
