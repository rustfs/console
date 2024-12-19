<template>
  <div>
    <content>
      <page-header>
        <template #title>
          <div class="flex items-center gap-4">
            <h1 @click="$router.push(bucketPath())" class="cursor-pointer">{{ bucketName }}</h1>
            <template v-for="(segment, i) in prefixSegements">
              <span class="text-gray-500">/</span>
              <button @click="$router.push(bucketPath(prefixSegements.slice(0, i + 1)) + encodeURIComponent('/'))" class="text-blue-500 hover:underline">{{ segment }}</button>
            </template>
          </div>
        </template>
      </page-header>
      <page-content class="flex flex-col gap-4">
        <object-list v-if="isObjectList" :bucket="bucketName" :path="key" />
        <object-view v-else :bucket="bucketName" :object-key="key" />
      </page-content>
    </content>
    <footer />
  </div>
</template>

<script lang="ts" setup>

import { useRoute } from '#app'
import { joinRelativeURL } from 'ufo'
import { computed } from 'vue'

// 从路由参数中获取 bucketName, pageSize, continuationToken
const route = useRoute()

// bucketName 和 pageSize 来自路由
const bucketName = computed(() => route.params.bucket as string)
// 当前路径的前缀, example: 'folder1/folder2/'
const key = computed(() => decodeURIComponent(route.params.key as string))

const bucketPath = (path?: string | Array<string>) => {
  if (Array.isArray(path)) {
    path = path.join('/')
  }

  return joinRelativeURL('/browser', encodeURIComponent(bucketName.value), path ? encodeURIComponent(path) : '')
}

// 将前缀分割成数组，用于显示面包屑
const prefixSegements = computed(() => key.value.split('/').filter(Boolean))

const isObjectList = key.value.endsWith('/') || key.value === ''

</script>
