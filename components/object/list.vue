<template>
  <div class="space-y-4">
    <PageHeader class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <AppInput
          v-model="searchTerm"
          :placeholder="t('Search')"
          class="max-w-md"
          @input="handleSearch"
        />
        <div class="flex flex-wrap items-center gap-2">
          <object-upload-stats />
          <object-delete-stats />
          <AppButton variant="secondary" @click="() => handleNewObject(true)">
            <Icon name="ri:add-line" class="size-4" />
            <span>{{ t('New Folder') }}</span>
          </AppButton>
          <AppButton variant="secondary" @click="() => (uploadPickerVisible = true)">
            <Icon name="ri:file-add-line" class="size-4" />
            <span>{{ t('Upload File') }}/{{ t('Folder') }}</span>
          </AppButton>
          <AppButton
            variant="destructive"
            :disabled="!checkedKeys.length"
            v-show="checkedKeys.length"
            @click="handleBatchDelete"
          >
            <Icon name="ri:delete-bin-5-line" class="size-4" />
            <span>{{ t('Delete Selected') }}</span>
          </AppButton>
          <AppButton
            variant="outline"
            :disabled="!checkedKeys.length"
            v-show="checkedKeys.length"
            @click="downloadMultiple"
          >
            <Icon name="ri:download-cloud-2-line" class="size-4" />
            <span>{{ t('Download') }}</span>
          </AppButton>
          <AppButton variant="outline" @click="refresh">
            <Icon name="ri:refresh-line" class="size-4" />
            <span>{{ t('Refresh') }}</span>
          </AppButton>
        </div>
      </div>
    </PageHeader>

    <AppCard padded class="border border-border/60">
      <AppDataTable
        :table="table"
        :is-loading="loading"
        :empty-title="t('No Objects')"
        :empty-description="t('Upload files or create folders to populate this bucket.')"
      />
    </AppCard>

    <div class="flex justify-end gap-2">
      <AppButton variant="outline" :disabled="!continuationToken" @click="goToPreviousPage">
        <Icon name="ri:arrow-left-s-line" class="mr-2" />
        <span>{{ t('Previous Page') }}</span>
      </AppButton>
      <AppButton variant="outline" :disabled="!nextToken" @click="goToNextPage">
        <span>{{ t('Next Page') }}</span>
        <Icon name="ri:arrow-right-s-line" class="ml-2" />
      </AppButton>
    </div>

    <object-upload-picker
      :show="uploadPickerVisible"
      :bucketName="bucketName"
      :prefix="prefix"
      @update:show="val => {
        uploadPickerVisible = val
        refresh()
      }"
    />
    <object-new-form
      :show="newObjectFormVisible"
      :bucketName="bucketName"
      :prefix="prefix"
      :asPrefix="newObjectAsPrefix"
      @update:show="val => {
        newObjectFormVisible = val
        refresh()
      }"
    />
    <object-info ref="infoRef" @refresh-parent="handleObjectDeleted" />
  </div>
</template>

<script setup lang="ts">
import { icon } from '@/utils/ui'
import { AppButton, AppCard, AppDataTable, AppInput } from '@/components/app'
import { useDataTable } from '@/components/app/data-table'
import PageHeader from '@/components/page/header.vue'
import { ListObjectsV2Command, type CommonPrefix, type _Object } from '@aws-sdk/client-s3'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { joinRelativeURL } from 'ufo'
import { computed, h, ref, watch } from 'vue'

const { $s3Client } = useNuxtApp()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const props = defineProps<{ bucket: string; path: string }>()

const uploadPickerVisible = ref(false)
const newObjectFormVisible = ref(false)
const newObjectAsPrefix = ref(false)
const searchTerm = ref('')
const loading = ref(false)

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

const uploadTaskStore = useUploadTaskManagerStore()
const deleteTaskStore = useDeleteTaskManagerStore()

const bucketName = computed(() => props.bucket)
const prefix = computed(() => decodeURIComponent(props.path))

const bucketPath = (path?: string | string[]) => {
  const value = Array.isArray(path) ? path.join('/') : path
  return joinRelativeURL('/browser', encodeURIComponent(bucketName.value), value ? encodeURIComponent(value) : '')
}

const continuationToken = ref<string | undefined>(undefined)
const tokenHistory = ref<string[]>([])
const nextToken = ref<string | undefined>(undefined)

const infoRef = ref<{ openDrawer: (bucket: string, key: string) => void }>()

const handleNewObject = (asPrefix: boolean) => {
  newObjectAsPrefix.value = asPrefix
  newObjectFormVisible.value = true
}

const handleObjectDeleted = () => {
  refresh()
}

const fetchObjects = async () => {
  loading.value = true
  try {
    const params: any = {
      Bucket: bucketName.value,
      Prefix: prefix.value,
      ContinuationToken: continuationToken.value,
      MaxKeys: Number.parseInt((route.query.pageSize as string) ?? '100', 10),
    }

    const response = await $s3Client.send(new ListObjectsV2Command(params))
    nextToken.value = response.NextContinuationToken

    const prefixData = (response.CommonPrefixes ?? []).map(item => ({
      Key: item.Prefix ?? '',
      type: 'prefix' as const,
      Size: 0,
      LastModified: '',
    }))

    const objectData = (response.Contents ?? []).map(item => ({
      Key: item.Key ?? '',
      type: 'object' as const,
      Size: item.Size ?? 0,
      LastModified: item.LastModified ? item.LastModified.toISOString() : '',
    }))

    return [...prefixData, ...objectData]
  } finally {
    loading.value = false
  }
}

const { data, refresh } = await useAsyncData(
  () => ['objects', bucketName.value, prefix.value, continuationToken.value, searchTerm.value],
  async () => {
    const objects = await fetchObjects()
    if (!searchTerm.value) return objects
    const term = searchTerm.value.toLowerCase()
    return objects.filter(item => item.Key.toLowerCase().includes(term))
  },
  { default: () => [] }
)

const checkedKeys = ref<string[]>([])

const columns = computed(() => {
  return [
    {
      id: 'select',
      enableSorting: false,
      header: ({ table }: any) =>
        h('input', {
          type: 'checkbox',
          checked: table.getIsAllPageRowsSelected(),
          indeterminate: table.getIsSomePageRowsSelected(),
          onChange: (event: Event) => table.toggleAllPageRowsSelected((event.target as HTMLInputElement).checked),
        }),
      cell: ({ row }: any) =>
        h('input', {
          type: 'checkbox',
          checked: row.getIsSelected(),
          onChange: (event: Event) => row.toggleSelected((event.target as HTMLInputElement).checked),
        }),
    },
    {
      header: () => t('Object'),
      cell: ({ row }: any) => {
        const displayKey = prefix.value ? row.original.Key.substring(prefix.value.length) : row.original.Key
        const label = displayKey || '/'
        if (row.original.type === 'prefix') {
          return h(
            NuxtLink,
            {
              href: bucketPath(row.original.Key),
              class: 'flex items-center gap-2 text-primary hover:underline',
            },
            () => [h(Icon, { name: 'ri:folder-line', class: 'size-4' }), label]
          )
        }
        return h(
          'button',
          {
            class: 'flex items-center gap-2 text-primary hover:underline',
            onClick: () => infoRef.value?.openDrawer(bucketName.value, row.original.Key),
          },
          () => [h(Icon, { name: 'ri:file-line', class: 'size-4' }), label]
        )
      },
    },
    {
      header: () => t('Size'),
      cell: ({ row }: any) => (row.original.type === 'object' ? formatBytes(row.original.Size) : ''),
    },
    {
      header: () => t('Last Modified'),
      cell: ({ row }: any) => (row.original.LastModified ? dayjs(row.original.LastModified).format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      id: 'actions',
      header: () => t('Actions'),
      enableSorting: false,
      cell: ({ row }: any) =>
        h('div', { class: 'flex justify-center gap-2' }, [
          row.original.type === 'object'
            ? h(
                AppButton,
                {
                  variant: 'outline',
                  size: 'sm',
                  onClick: () => downloadFile(row.original.Key),
                },
                () => [h(Icon, { name: 'ri:download-cloud-2-line', class: 'size-4' }), h('span', t('Download'))]
              )
            : null,
          h(
            AppButton,
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

const { table } = useDataTable({
  data,
  columns,
  getRowId: (row: any) => row.Key,
  state: computed(() => ({
    rowSelection: checkedKeys.value.reduce((acc: Record<string, boolean>, key) => {
      acc[key] = true
      return acc
    }, {}),
  })),
  onRowSelectionChange: updater => {
    const next = typeof updater === 'function' ? updater({}) : updater
    checkedKeys.value = Object.keys(next).filter(key => next[key])
  },
})

watch(
  () => uploadTaskStore.tasks,
  () => setTimeout(refresh, 500),
  { deep: true }
)

watch(
  () => deleteTaskStore.tasks,
  () => setTimeout(refresh, 500),
  { deep: true }
)

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

const downloadFile = async (key: string) => {
  const url = bucketPath(['download', key])
  window.open(url, '_blank')
}

const downloadMultiple = async () => {
  if (!checkedKeys.value.length) return

  const zip = new JSZip()
  const folderMap: Record<string, JSZip> = {}

  for (const key of checkedKeys.value) {
    const response = await fetch(bucketPath(['download', key]))
    const blob = await response.blob()
    const relativeKey = prefix.value ? key.replace(prefix.value, '') : key
    const parts = relativeKey.split('/').filter(Boolean)
    const fileName = parts.pop() ?? key
    const folderPath = parts.join('/')

    const folder = folderPath
      ? folderMap[folderPath] || (folderMap[folderPath] = zip.folder(folderPath)!)
      : zip

    folder.file(fileName, blob)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${bucketName.value}-${Date.now()}.zip`)
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
  const bucket = bucketName.value
  const taskStore = useDeleteTaskManagerStore()
  for (const key of keys) {
    await taskStore.addTask({ bucket, key })
  }
  checkedKeys.value = []
  refresh()
}

const handleBatchDelete = () => {
  if (!checkedKeys.value.length) return
  confirmDelete([...checkedKeys.value])
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}
</script>
