<template>
  <page>
    <page-header>
      <div class="flex items-center gap-4">
        <h1 @click="$router.push(bucketPath())" class="cursor-pointer">{{ bucketName }}</h1>
        <object-path-links :object-key="key" @click="path => $router.push(bucketPath(path))" />
      </div>
    </page-header>
    <div class="flex flex-col gap-4">
      <object-list v-if="isObjectList" :bucket="bucketName" :path="key" />
      <object-view v-else :bucket-name="bucketName" :object-key="key" />
    </div>
  </page>
</template>

<script lang="ts" setup>
import { useRoute } from '#app'
import { endsWith } from 'lodash'
import { joinRelativeURL } from 'ufo'
import { computed } from 'vue'
import { resolveRouteParam } from '~/utils/functions'

// 从路由参数中获取 bucketName, pageSize, continuationToken
const route = useRoute()

const message = useMessage()
const router = useRouter()

// bucketName 和 pageSize 来自路由
const bucketName = computed(() => resolveRouteParam(route.params.bucket))
// 检测bucketName是否存在，使用 head bucket 接口,如果不存在跳转到/browser
const isBucketExist = () => {
  return useBucket({ region: route.params.region as string })
    .headBucket(bucketName.value)
    .then(res => {
      return true
    })
    .catch(err => {
      message.error('Bucket not found')
      router.push('/browser')
    })
}

isBucketExist()

// 当前路径的前缀, example: 'folder1/folder2/'
const key = computed(() => resolveRouteParam(route.params.key))

const bucketPath = (path: string | Array<string> = '') => {
  if (Array.isArray(path)) {
    path = path.join('/')
  }

  if (path.length > 1) {
    path = endsWith(path, '/') ? path : path + '/'
  }

  return joinRelativeURL('/browser', encodeURIComponent(bucketName.value), encodeURIComponent(path))
}

const isObjectList = computed(() => key.value === '' || key.value.endsWith('/'))
</script>
