<template>
  <div>
    <page-header>
      <template #title>
        <div class="flex items-center gap-4">
          <h1 class="cursor-pointer">{{ bucketName }}</h1>
        </div>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <buckets-info :bucket="bucketName" />
    </page-content>
    <footer />
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from '#app'
import { computed } from 'vue'

// 从路由参数中获取 bucketName, pageSize, continuationToken
const route = useRoute();
const bucketName = computed(() => decodeURIComponent(route.params.key as string));
</script>
