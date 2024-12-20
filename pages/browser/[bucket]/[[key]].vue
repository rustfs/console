<template>
  <div>
    <content>
      <page-header>
        <template #title>
          <div class="flex items-center gap-4">
            <h1 @click="$router.push(bucketPath())" class="cursor-pointer">{{ bucketName }}</h1>
            <object-path-links :object-key="key" @click="(path) => $router.push(bucketPath(path))" />
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
import { endsWith } from 'lodash'
import { joinRelativeURL } from 'ufo'
import { computed } from 'vue'

// 从路由参数中获取 bucketName, pageSize, continuationToken
const route = useRoute()

// bucketName 和 pageSize 来自路由
const bucketName = computed(() => route.params.bucket as string)
// 当前路径的前缀, example: 'folder1/folder2/'
const key = computed(() => decodeURIComponent(route.params.key as string))

const bucketPath = (path: string | Array<string> = '') => {
  if (Array.isArray(path)) {
    path = path.join('/')
  }

  if (path.length > 1) {
    path = endsWith(path, '/') ? path : path + '/'
  }

  return joinRelativeURL('/browser', encodeURIComponent(bucketName.value), encodeURIComponent(path))
}

const isObjectList = key.value.endsWith('/') || key.value === ''

</script>
