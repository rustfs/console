<template>
  <div class="w-full bg-gray-50 dark:bg-black h-full p-16 flex flex-col justify-center gap-8">
    <div class="max-w-7xl flex flex-col">
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
    <WorldMap
      class="absolute inset-0"
      :dots="dots"
      :map-color="isDark ? '#FFFFFF40' : '#00000040'"
      :map-bg-color="isDark ? 'black' : '#f9fafb'"
    />
    <a
      href=" https://www.rustfs.com"
      class="text-primary-500 inline-flex w-min items-center gap-2 leading-none p-2 px-5 border rounded-full border-blue-500"
    >
      <span>{{ t('Visit website') }}</span>
      <Icon name="ri:arrow-right-long-fill" class="mr-2" />
    </a>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import FlipWords from '~/components/ui/flip-words/FlipWords.vue';
import WorldMap from '~/components/ui/world-map/WorldMap.vue';

const { t, locale } = useI18n();

const dots = [
  {
    start: {
      lat: 64.2008,
      lng: -149.4937,
    }, // Alaska (Fairbanks)
    end: {
      lat: 34.0522,
      lng: -118.2437,
    }, // Los Angeles
  },
  {
    start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
    end: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
  },
  {
    start: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
    end: { lat: 38.7223, lng: -9.1393 }, // Lisbon
  },
  {
    start: { lat: 51.5074, lng: -0.1278 }, // London
    end: { lat: 28.6139, lng: 77.209 }, // New Delhi
  },
  {
    start: { lat: 28.6139, lng: 77.209 }, // New Delhi
    end: { lat: 43.1332, lng: 131.9113 }, // Vladivostok
  },
  {
    start: { lat: 28.6139, lng: 77.209 }, // New Delhi
    end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
  },
];

const mode = useColorMode();
const isDark = computed(() => mode.value == 'dark');
</script>
