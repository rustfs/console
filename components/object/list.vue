<template>
  <div class="space-y-6">
    <page-header>
      <div class="flex flex-wrap items-center gap-4 min-w-[40vw]">
        <SearchInput v-model="searchTerm" :placeholder="t('Search')" clearable class="lg:max-w-sm" />
        <label class="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox v-model="showDeleted" />
          <span>{{ t('Show Deleted Objects') }}</span>
        </label>
      </div>
      <template #actions>
        <object-task-stats :tasks="taskStore.tasks" :on-clear-tasks="taskStore.clearTasks">
          <template #task-list="{ tasks }">
            <object-task-list :tasks="tasks" />
          </template>
        </object-task-stats>
        <!-- <Button variant="outline" @click="() => handleNewObject(true)">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('New Folder') }}</span>
        </Button> -->
        <Button variant="outline" @click="() => (uploadPickerVisible = true)">
          <Icon name="ri:file-add-line" class="size-4" />
          <span>{{ t('Upload File') }}/{{ t('Folder') }}</span>
        </Button>
        <Button
          variant="outline"
          class="text-destructive border-destructive"
          :disabled="!checkedKeys.length"
          v-show="checkedKeys.length"
          @click="handleBatchDelete"
        >
          <Icon name="ri:delete-bin-5-line" class="size-4" />
          <span>{{ t('Delete Selected') }}</span>
        </Button>
        <Button variant="outline" :disabled="!checkedKeys.length" v-show="checkedKeys.length" @click="downloadMultiple">
          <Icon name="ri:download-cloud-2-line" class="size-4" />
          <span>{{ t('Download') }}</span>
        </Button>
        <Button variant="outline" @click="handleRefresh">
          <Icon name="ri:refresh-line" class="size-4" />
          <span>{{ t('Refresh') }}</span>
        </Button>
      </template>
    </page-header>

    <DataTable
      :table="table"
      :is-loading="loading"
      :empty-title="t('No Objects')"
      :empty-description="t('Upload files or create folders to populate this bucket.')"
    />

    <div class="flex justify-end gap-2">
      <Button variant="outline" :disabled="!continuationToken" @click="goToPreviousPage">
        <Icon name="ri:arrow-left-s-line" class="mr-2" />
        <span>{{ t('Previous Page') }}</span>
      </Button>
      <Button variant="outline" :disabled="!nextToken" @click="goToNextPage">
        <span>{{ t('Next Page') }}</span>
        <Icon name="ri:arrow-right-s-line" class="ml-2" />
      </Button>
    </div>
  </div>

  <object-upload-picker
    :show="uploadPickerVisible"
    :bucketName="bucketName"
    :prefix="prefix"
    @update:show="
      val => {
        uploadPickerVisible = val
        refresh()
      }
    "
  />
  <object-new-form
    :show="newObjectFormVisible"
    :bucketName="bucketName"
    :prefix="prefix"
    :asPrefix="newObjectAsPrefix"
    @update:show="
      val => {
        newObjectFormVisible = val
        refresh()
      }
    "
  />
  <object-info ref="infoRef" :bucket-name="bucketName" @refresh-parent="handleObjectDeleted" />
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

import { useLocalStorage } from '@vueuse/core'

import { Icon, NuxtLink } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import type { HttpRequest } from '@smithy/protocol-http'
import type { ColumnDef } from '@tanstack/vue-table'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { joinRelativeURL } from 'ufo'
import type { VNode } from 'vue'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTaskManagerStore } from '~/store/tasks'

const { $s3Client } = useNuxtApp()
const { t } = useI18n()
const route = useRoute()
const dialog = useDialog()
const props = defineProps<{ bucket: string; path: string }>()

const uploadPickerVisible = ref(false)
const newObjectFormVisible = ref(false)
const newObjectAsPrefix = ref(false)
const searchTerm = ref('')
const loading = ref(false)
const showDeleted = useLocalStorage('object-list-show-deleted', false)

const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout | null = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

const handleSearch = debounce(() => {
  continuationToken.value = undefined
  tokenHistory.value = []
  refresh()
}, 300)

watch(searchTerm, () => {
  handleSearch()
})

const taskStore = useTaskManagerStore()

type ObjectRow = {
  Key: string
  type: 'prefix' | 'object'
  Size: number
  LastModified: string
}

const bucketName = computed(() => props.bucket)
const prefix = computed(() => decodeURIComponent(props.path))
const pageSize = computed(() => {
  const q = route.query.pageSize
  const s = Array.isArray(q) ? q[0] : q
  const size = Number.parseInt(s ?? '', 10)
  return Number.isFinite(size) && size > 0 ? size : 25
})

const bucketPath = (path?: string | string[]) => {
  const value = Array.isArray(path) ? path.join('/') : path
  return joinRelativeURL('/browser', encodeURIComponent(bucketName.value), value ? encodeURIComponent(value) : '')
}

const continuationToken = ref<string | undefined>(undefined)
const tokenHistory = ref<string[]>([])
const nextToken = ref<string | undefined>(undefined)

const infoRef = ref<{ openDrawer: (bucket: string, key: string) => void }>()
const message = useMessage()
const objectApi = useObject({ bucket: bucketName.value })

const handleNewObject = (asPrefix: boolean) => {
  newObjectAsPrefix.value = asPrefix
  newObjectFormVisible.value = true
}

const handleObjectDeleted = () => {
  refresh()
}

const fetchObjects = async (): Promise<ObjectRow[]> => {
  loading.value = true
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName.value,
      Prefix: prefix.value,
      Delimiter: '/',
      ContinuationToken: continuationToken.value,
      MaxKeys: pageSize.value,
    })

    if (showDeleted.value) {
      command.middlewareStack.add(
        next => async args => {
          const request = args.request as HttpRequest
          request.headers['X-Rustfs-Include-Deleted'] = 'true'
          return next(args)
        },
        { step: 'build', name: 'includeDeletedObjectsMiddleware', tags: ['INCLUDE_DELETED'] }
      )
    }

    const response = await $s3Client.send(command)

    nextToken.value = response.NextContinuationToken

    const prefixItems: ObjectRow[] = (response.CommonPrefixes ?? []).map(item => ({
      Key: item.Prefix ?? '',
      type: 'prefix' as const,
      Size: 0,
      LastModified: '',
    }))

    const objectItems: ObjectRow[] = (response.Contents ?? []).map(item => ({
      Key: item.Key ?? '',
      type: 'object' as const,
      Size: item.Size ?? 0,
      LastModified: item.LastModified ? item.LastModified.toISOString() : '',
    }))

    return [...prefixItems, ...objectItems]
  } finally {
    // 200ms delay to avoid flickering
    setTimeout(() => {
      loading.value = false
    }, 200)
  }
}

const asyncDataCacheKey = computed(() => {
  return `objects-${bucketName.value}-${prefix.value}-${continuationToken.value || 'start'}-${searchTerm.value || 'all'}-${
    showDeleted.value ? 'withDeleted' : 'withoutDeleted'
  }`
})

const displayKey = (key: string) => {
  if (!prefix.value) return key
  return key.startsWith(prefix.value) ? key.slice(prefix.value.length) : key
}

const { data, refresh } = await useAsyncData<ObjectRow[]>(
  asyncDataCacheKey,
  async () => {
    const objects = await fetchObjects()
    const term = searchTerm.value.toLowerCase()

    return objects.filter(item => {
      if (term) {
        const key = displayKey(item.Key).toLowerCase()
        return key.includes(term)
      }
      return item.Key !== prefix.value
    })
  },
  {
    default: () => [],
    watch: [bucketName, prefix, continuationToken, searchTerm, showDeleted],
  }
)

watch(showDeleted, () => {
  continuationToken.value = undefined
  tokenHistory.value = []
  refresh()
})

const columns = computed<ColumnDef<ObjectRow, any>[]>(() => {
  return [
    {
      id: 'object',
      header: () => t('Object'),
      cell: ({ row }: any) => {
        const key = row.original.Key ?? ''
        const displayKey = prefix.value ? key.substring(prefix.value.length) : key

        let label: string | VNode = displayKey || '/'

        if (row.original.type === 'prefix') {
          return h(
            NuxtLink,
            {
              href: bucketPath(row.original.Key),
              class: 'flex items-center gap-2 text-blue-500 hover:underline',
            },
            {
              default: () => [h(Icon, { name: 'ri:folder-line', class: 'size-4' }), h('span', label)],
            }
          )
        }
        return h(
          'button',
          {
            class: 'flex items-center gap-2 text-primary hover:underline',
            onClick: () => infoRef.value?.openDrawer(bucketName.value, row.original.Key),
          },
          [h(Icon, { name: 'ri:file-line', class: 'size-4' }), h('span', label)]
        )
      },
    },
    {
      id: 'size',
      header: () => t('Size'),
      cell: ({ row }: any) => (row.original.type === 'object' ? formatBytes(row.original.Size) : '-'),
    },
    {
      id: 'lastModified',
      header: () => t('Last Modified'),
      cell: ({ row }: any) =>
        row.original.LastModified ? dayjs(row.original.LastModified).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      id: 'actions',
      header: () => t('Actions'),
      enableSorting: false,
      cell: ({ row }: any) =>
        h('div', { class: 'flex items-center gap-2' }, [
          row.original.type === 'object'
            ? h(
                Button,
                {
                  variant: 'outline',
                  size: 'sm',
                  onClick: () => downloadFile(row.original.Key),
                },
                () => [h(Icon, { name: 'ri:download-cloud-2-line', class: 'size-4' }), h('span', t('Download'))]
              )
            : null,
          h(
            Button,
            {
              variant: 'outline',
              size: 'sm',
              onClick: () => confirmDelete([row.original.Key]),
            },
            () => [h(Icon, { name: 'ri:delete-bin-5-line', class: 'size-4' }), h('span', t('Delete'))]
          ),
        ]),
    },
  ]
})

const { table, selectedRowIds } = useDataTable<ObjectRow>({
  data,
  columns,
  getRowId: (row: any) => row.Key,
  enableRowSelection: true,
  manualPagination: true,
})

// Use selectedRowIds from data-table instead of manually maintaining checkedKeys
const checkedKeys = computed(() => selectedRowIds.value)

// 监听任务完成事件，只在所有任务完成时刷新列表
// 这样可以避免在上传/删除大量文件时频繁刷新
// 保存事件处理函数引用，以便在卸载时正确清理
const handleAllTasksCompleted = () => {
  refresh()
}

onMounted(() => {
  // 监听所有任务全部完成事件（上传/删除）
  taskStore.on('drained', handleAllTasksCompleted)
})

onUnmounted(() => {
  // 清理事件监听器
  taskStore.off('drained', handleAllTasksCompleted)
})

const goToNextPage = () => {
  if (!nextToken.value) return
  if (continuationToken.value) {
    tokenHistory.value.push(continuationToken.value)
  }
  continuationToken.value = nextToken.value
  refresh()
}

const goToPreviousPage = () => {
  const prev = tokenHistory.value.pop()
  continuationToken.value = prev
  refresh()
}

const handleRefresh = () => {
  refresh()
}

const computeRelativeKey = (key: string) => {
  if (!key) return ''
  const base = prefix.value || ''
  return base && key.startsWith(base) ? key.slice(base.length) : key
}

const collectKeysForDeletion = async (keys: string[]) => {
  const rows = data.value ?? []
  const rowMap = new Map(rows.map(item => [item.Key, item]))
  const collected: string[] = []

  for (const key of keys) {
    if (!key) continue
    const row = rowMap.get(key)
    if (row?.type === 'prefix') {
      await objectApi.mapAllFiles(bucketName.value, row.Key, fileKey => {
        if (fileKey) {
          collected.push(fileKey)
        }
      })
    } else {
      collected.push(key)
    }
  }

  return Array.from(new Set(collected))
}

const downloadFile = async (key: string) => {
  if (!key) return
  const loadingMsg = message.loading(t('Getting URL'), { duration: 0 })
  try {
    const url = await objectApi.getSignedUrl(key)
    fetch(url).then(async response => {
      // 获取头信息
      const headers: any = response.headers
      let blob = await response.blob()
      exportFile({ headers, data: blob }, key.split('/').pop() || '')
    })
  } catch (error: any) {
    message.error(error?.message || t('Download Failed'))
  } finally {
    loadingMsg.destroy()
  }
}

const downloadMultiple = async () => {
  if (!checkedKeys.value.length) {
    message.warning(t('Please select at least one item'))
    return
  }

  const selectedRows = (data.value ?? []).filter(item => checkedKeys.value.includes(item.Key))
  if (!selectedRows.length) {
    message.warning(t('No files to download'))
    return
  }

  const collecting = message.loading(t('Collecting files'), { duration: 0 })
  const allFiles: { key: string; relative: string }[] = []

  try {
    for (const item of selectedRows) {
      if (item.type === 'object') {
        const relative = computeRelativeKey(item.Key)
        allFiles.push({ key: item.Key, relative })
      } else if (item.type === 'prefix') {
        await objectApi.mapAllFiles(bucketName.value, item.Key, fileKey => {
          const relative = computeRelativeKey(fileKey)
          allFiles.push({ key: fileKey, relative })
        })
      }
    }
  } catch (error: any) {
    collecting.destroy()
    message.error(error?.message || t('Download Failed'))
    return
  }

  collecting.destroy()

  if (!allFiles.length) {
    message.warning(t('No files to download'))
    return
  }

  const zip = new JSZip()
  let finished = 0
  let destroyProgress: (() => void) | null | undefined

  const updateProgress = () => {
    if (destroyProgress) destroyProgress()
    const handle = message.loading(`${t('Downloading files')} ${Math.round((finished / allFiles.length) * 100)}%`, {
      duration: 0,
    })
    destroyProgress = handle.destroy
  }

  updateProgress()

  try {
    await Promise.all(
      allFiles.map(async ({ key, relative }) => {
        const url = await objectApi.getSignedUrl(key)
        const response = await fetch(url)
        const blob = await response.blob()
        zip.file(relative || key, blob)
        finished++
        updateProgress()
      })
    )
  } catch (error: any) {
    if (destroyProgress) destroyProgress()
    message.error(error?.message || t('Download Failed'))
    return
  }

  if (destroyProgress) destroyProgress()

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${bucketName.value || 'download'}.zip`)
  message.success(t('Download ready'))
}

const confirmDelete = (keys: string[]) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete the selected objects?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => handleDelete(keys),
  })
}

const handleDelete = async (keys: string[]) => {
  try {
    const targets = await collectKeysForDeletion(keys)
    if (!targets.length) {
      message.success(t('Delete Success'))
    } else {
      taskStore.addDeleteKeys(targets, bucketName.value)
      message.success(t('Delete task created'))
    }
    table.resetRowSelection()
    refresh()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}

const handleBatchDelete = () => {
  if (!checkedKeys.value.length) {
    message.warning(t('Please select at least one item'))
    return
  }
  confirmDelete([...checkedKeys.value])
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}
</script>
