<template>
  <n-page-header subtitle="" @back="router.back()">
    <template #title>
      <div class="flex items-center justify-between">
        <n-input placeholder="搜索">
          <template #prefix>
            <Icon name="ri:search-2-line" />
          </template>
        </n-input>
      </div>
    </template>
    <template #extra>

      <div class="flex items-center gap-4">
        <n-button>
          <Icon name="ri:add-line" class="mr-2" />
          <span>新建目录</span>
        </n-button>
        <n-button>
          <Icon name="ri:file-add-line" class="mr-2" />
          <span>上传文件/文件夹</span>
        </n-button>
        <n-button-group>
          <n-button @click="goToPreviousPage" :disabled="!previousToken">
            <Icon name="ri:arrow-left-s-line" class="mr-2" />
            <span>上一页</span>
          </n-button>
          <n-button @click="goToNextPage" :disabled="!nextToken">
            <span>下一页</span>
            <Icon name="ri:arrow-right-s-line" class="ml-2" />
          </n-button>
        </n-button-group>
        <n-button @click="() => refresh()">
          <Icon name="ri:refresh-line" class="mr-2" />
          <span>刷新</span>
        </n-button>
      </div>
    </template>
  </n-page-header>
  <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="objects" :pagination="false" :bordered="false" />
</template>

<script setup lang="ts">
const { $s3Client } = useNuxtApp();

import { useAsyncData, useRoute, useRouter } from '#app'
import { NuxtLink } from '#components'
import { ListObjectsV2Command, type _Object, type CommonPrefix } from '@aws-sdk/client-s3'
import { joinRelativeURL } from 'ufo'
import { computed, ref, type VNode } from 'vue'

const route = useRoute()
const router = useRouter()

const props = defineProps<{ bucket: string; path: string }>()

// bucketName
const bucketName = computed(() => props.bucket as string)
// 当前路径的前缀, example: '/folder1/folder2/'
const prefix = computed(() => decodeURIComponent(props.path as string))

// query 参数
const pageSize = computed(() => parseInt(route.query.pageSize as string, 10))
const continuationToken = computed(() => route.query.continuationToken as string)

const bucketPath = (path?: string | Array<string>) => {
  if (Array.isArray(path)) {
    path = path.join('/')
  }

  return joinRelativeURL('/browser', encodeURIComponent(bucketName.value), path ? encodeURIComponent(path) : '')
}

const columns = [
  {
    key: 'Key', title: '对象', render: (row: { Key: string, type: 'prefix' | 'object' }) => {
      const displayKey = prefix.value ? row.Key.substring(prefix.value.length) : row.Key
      let label: string | VNode = displayKey || '根目录'

      if (row.type === 'prefix') {
        label = h('span', { class: 'inline-flex items-center gap-2' }, [icon('ri:folder-line'), label])
      }

      const keyInUri = row.Key

      return h(NuxtLink, { href: bucketPath(keyInUri) }, label)
    }
  },
  { key: 'Size', title: '大小', render: (row: { Size: number }) => row.Size ? formatBytes(row.Size) : '' },
  { key: 'LastModified', title: '更新时间' }
]

interface ListObjectsResponse {
  contents: _Object[]
  commonPrefixes: CommonPrefix[]
  nextContinuationToken: string | null
  isTruncated: boolean
}

// 在服务端获取数据
const { data, refresh } = await useAsyncData<ListObjectsResponse>(`objectsData&${prefix.value}&${pageSize.value}&${continuationToken.value}`, async () => {
  const params = {
    Bucket: bucketName.value,
    MaxKeys: pageSize.value || 25,
    Delimiter: '/',
    Prefix: prefix.value || undefined,
    ContinuationToken: continuationToken.value
  }

  const result = await $s3Client.send(new ListObjectsV2Command(params))

  return {
    contents: result.Contents || [],
    commonPrefixes: result.CommonPrefixes || [],
    nextContinuationToken: result.NextContinuationToken || null,
    isTruncated: result.IsTruncated ?? false
  }
})

const contents = computed(() => data.value?.contents || [])
const commonPrefixes = computed(() => data.value?.commonPrefixes || [])
const nextToken = computed(() => data.value?.nextContinuationToken || null)

const objects = computed(() => {
  return commonPrefixes.value.map((prefix) => {
    return {
      Key: prefix.Prefix,
      type: 'prefix',
      Size: 0,
      LastModified: new Date(0)
    }
  }).concat(contents.value.map((object) => {
    return {
      Key: object.Key,
      type: 'object',
      Size: object.Size ?? 0,
      LastModified: object.LastModified ?? new Date(0)
    }
  }))
})

// 为了实现 “Previous” 功能，需要记录访问过的 token 列表。
// 因为我们是通过路由导航，每次下一页时会改变 URL，从而 SSR 获取新数据。
// 当访问过的 token 会体现在浏览器历史记录中。
// 在这种设计中，每次点击 Next/Previous 都会换 URL，并生成新 SSR 页面。
// 因此“上一页”可以通过浏览器后退实现，也可以在数据中保存 token 来人工实现。
// 这里演示一个简化版本——在客户端保存 tokenHistory。
// 请注意：刷新后 tokenHistory 会丢失，因为它是前端状态。
const tokenHistory = ref<string[]>([])

// 当页面加载后，如果 continuationToken 有值，就表示不是第一页
// 将当前 continuationToken 添加到历史中
if (continuationToken.value && !tokenHistory.value.includes(continuationToken.value)) {
  tokenHistory.value.push(continuationToken.value)
}

// previousToken 根据 tokenHistory 来确定
// tokenHistory 中最后一个是当前页的 token，上一个则是 previousToken
const previousToken = computed(() => {
  if (tokenHistory.value.length < 2) return null
  // 倒数第二个是上一页的 token
  return tokenHistory.value[tokenHistory.value.length - 2]
})

function goToNextPage() {
  if (nextToken.value) {
    // 导航到新路由
    router.push(`?continuationToken=${nextToken.value}`)
  }
}

function goToPreviousPage() {
  if (previousToken.value) {
    router.push(`?continuationToken=${previousToken.value}`)
    // 将上一页 token 之后的 tokenHistory 中的 token 删除，以表示回退
    const prevIndex = tokenHistory.value.indexOf(previousToken.value)
    tokenHistory.value.splice(prevIndex + 1)
  } else {
    // 如果没有 previousToken，表示已经在第一页
    // 导航到没有 token 的路由（第一页）
    if (continuationToken.value) {
      router.push(``)
      tokenHistory.value.length = 0
    }
  }
}
</script>
