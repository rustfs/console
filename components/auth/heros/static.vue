<template>
  <div
    class="w-full bg-gray-50 dark:bg-black h-full p-16 flex flex-col justify-center gap-8 overflow-hidden relative border-r dark:border-none"
  >
    <div class="max-w-7xl flex flex-col z-10">
      <img src="~/assets/logo.svg" class="max-w-28" alt="" />
      <div class="text-4xl my-6 font-semibold !text-primary px-0">
        <span :class="{ 'pr-1': locale !== 'zh' }">{{ t('Rust-based') }} </span>
        <FlipWords
          :words="[
            t('High Performance'),
            t('Infinite Scaling'),
            t('Secure & Reliable'),
            t('Multi-Cloud Storage'),
            t('S3 Compatible'),
          ]"
          :duration="3000"
          class="text-4xl font-semibold !text-primary px-0"
        />
        <div class="text-muted-foreground mt-2">
          {{ t('Reliable distributed file system') }}
        </div>
      </div>
    </div>
    <a
      href="https://www.rustfs.com"
      class="z-10 text-primary-500 inline-flex w-max items-center gap-2 leading-none p-2 px-5 border rounded-full border-blue-500"
    >
      <span>{{ t('Visit website') }}</span>
      <Icon name="ri:arrow-right-long-fill" class="mr-2" />
    </a>
    <div class="h-full inset-0 absolute z-0">
      <img
        src="~/assets/backgrounds/ttten.svg"
        class="absolute h-full w-full inset-0 z-0 opacity-45 object-cover"
        alt=""
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import FlipWords from '~/components/ui/flip-words/FlipWords.vue';

const { t, locale } = useI18n();
</script>
