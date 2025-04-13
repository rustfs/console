<template>
  <div class="w-full bg-gray-50 dark:bg-black h-full p-16 flex flex-col justify-center gap-8 overflow-hidden relative">
    <div class="max-w-7xl flex flex-col z-10">
      <img src="~/assets/logo.svg" class="max-w-28" alt="" />
      <div class="text-4xl my-6 font-semibold !text-primary px-0">
        <span>基于 Rust 的</span>
        <FlipWords :words="['高性能', '无限扩容', '安全可靠', '多云存储', '兼容 S3']" :duration="3000" class="text-4xl font-semibold !text-primary px-0" />
        <div class="text-muted-foreground mt-2">
          靠谱的分布式文件系统
        </div>
      </div>
    </div>
    <a href="https://www.rustfs.com" class="z-10 text-primary-500 inline-flex w-min items-center gap-2 leading-none p-2 px-5 border rounded-full border-blue-500">
      <span>www.rustfs.com</span>
      <Icon name="ri:arrow-right-long-fill" class="mr-2" />
    </a>
    <div class="h-full inset-0 absolute z-0">
      <Ripple class="bg-white/5 -mb-[100vh] h-full w-full -mr-[50vw] [mask-image:linear-gradient(to_bottom,white,transparent)]"
        circle-class="border-[hsl(var(--primary))] bg-[#0000]/25 dark:bg-[#fff]/25 rounded-full" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import FlipWords from '~/components/ui/flip-words/FlipWords.vue'
import Ripple from '~/components/ui/ripple/Ripple.vue'

const mode = useColorMode();
</script>
