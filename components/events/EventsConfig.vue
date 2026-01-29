<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium">{{ t('Events') }}</h2>
      <div class="flex gap-2">
        <Button type="button" variant="outline" @click="handleNew">
          <Icon class="size-4" name="ri:add-line" />
          <span>{{ t('Add Event Subscription') }}</span>
        </Button>
        <Button type="button" variant="outline" @click="handleRefresh" :disabled="loading">
          <Icon class="size-4" name="ri:refresh-line" />
          <span>{{ t('Refresh') }}</span>
        </Button>
      </div>
    </div>

    <DataTable
      :table="table"
      :is-loading="loading"
      :empty-title="t('No Data')"
      :empty-description="t('Add Event Subscription to get started')"
    />

    <events-new-form v-if="bucketName" ref="newRef" :bucketName="bucketName" @success="refresh" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/vue-table'
import { h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBucket } from '@/composables/useBucket'

const props = defineProps<{
  bucketName: string
}>()

const { t } = useI18n()
const { listBucketNotifications, putBucketNotifications } = useBucket({})
const dialog = useDialog()
const message = useMessage()

interface NotificationItem {
  id: string
  type: 'Lambda' | 'SQS' | 'SNS' | 'Topic'
  arn: string
  events: string[]
  prefix?: string
  suffix?: string
  filterRules?: Array<{ Name: string; Value: string }>
}

const eventDisplayMapping: Record<string, string> = {
  's3:ObjectCreated:*': 'PUT',
  's3:ObjectAccessed:*': 'GET',
  's3:ObjectRemoved:*': 'DELETE',
  's3:Replication:*': 'REPLICA',
  's3:ObjectRestore:*': 'RESTORE',
  's3:ObjectTransition:*': 'RESTORE',
  's3:Scanner:ManyVersions': 'SCANNER',
  's3:Scanner:BigPrefix': 'SCANNER',
}

const getDisplayEvents = (events: string[]) => {
  return [...new Set(events.map(event => eventDisplayMapping[event] || event))]
}

const typeBadgeClasses: Record<NotificationItem['type'], string> = {
  Lambda: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  SQS: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
  SNS: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  Topic: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100',
}

const loading = ref(false)
const pageData = ref<NotificationItem[]>([])

const columns: ColumnDef<NotificationItem>[] = [
  {
    id: 'type',
    header: () => t('Type'),
    cell: ({ row }) => h(Badge, { class: typeBadgeClasses[row.original.type] }, () => row.original.type),
    meta: { maxWidth: '7rem' },
  },
  {
    id: 'arn',
    header: () => t('ARN'),
    cell: ({ row }) => h('span', { class: 'line-clamp-2 break-all font-medium' }, row.original.arn),
    meta: { maxWidth: '180px' },
  },
  {
    id: 'events',
    header: () => t('Events'),
    cell: ({ row }) =>
      h(
        'div',
        { class: 'flex flex-wrap gap-1' },
        getDisplayEvents(row.original.events).map(event => h(Badge, { variant: 'secondary', key: event }, () => event))
      ),
    meta: { maxWidth: '13rem' },
  },
  {
    id: 'prefix',
    header: () => t('Prefix'),
    cell: ({ row }) => h('span', row.original.prefix || '-'),
    meta: { maxWidth: '9rem' },
  },
  {
    id: 'suffix',
    header: () => t('Suffix'),
    cell: ({ row }) => h('span', row.original.suffix || '-'),
    meta: { maxWidth: '9rem' },
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center' }, [
        h(
          Button,
          {
            type: 'button',
            size: 'sm',
            variant: 'outline',
            class: 'gap-2',
            onClick: (event: Event) => handleRowDelete(row.original, event),
          },
          () => [h(Icon, { class: 'size-4', name: 'ri:delete-bin-7-line' }), h('span', t('Delete'))]
        ),
      ]),
    meta: { maxWidth: '6rem' },
  },
]

const { table } = useDataTable<NotificationItem>({
  data: pageData,
  columns,
  getRowId: row => row.id,
})

const refresh = async () => {
  if (!props.bucketName) {
    pageData.value = []
    return
  }

  loading.value = true
  try {
    const data = await listBucketNotifications(props.bucketName)
    const items: NotificationItem[] = []

    if (data?.LambdaFunctionConfigurations) {
      data.LambdaFunctionConfigurations.forEach((config: any) => {
        items.push({
          id: config.Id,
          type: 'Lambda',
          arn: config.LambdaFunctionArn,
          events: config.Events,
          prefix: config.Filter?.Key?.FilterRules?.find((r: any) => r.Name === 'prefix')?.Value,
          suffix: config.Filter?.Key?.FilterRules?.find((r: any) => r.Name === 'suffix')?.Value,
          filterRules: config.Filter?.Key?.FilterRules,
        })
      })
    }
    if (data?.QueueConfigurations) {
      data.QueueConfigurations.forEach((config: any) => {
        items.push({
          id: config.Id,
          type: 'SQS',
          arn: config.QueueArn,
          events: config.Events,
          prefix: config.Filter?.Key?.FilterRules?.find((r: any) => r.Name === 'prefix')?.Value,
          suffix: config.Filter?.Key?.FilterRules?.find((r: any) => r.Name === 'suffix')?.Value,
          filterRules: config.Filter?.Key?.FilterRules,
        })
      })
    }
    if (data?.TopicConfigurations) {
      data.TopicConfigurations.forEach((config: any) => {
        items.push({
          id: config.Id,
          type: 'SNS',
          arn: config.TopicArn,
          events: config.Events,
          prefix: config.Filter?.Key?.FilterRules?.find((r: any) => r.Name === 'prefix')?.Value,
          suffix: config.Filter?.Key?.FilterRules?.find((r: any) => r.Name === 'suffix')?.Value,
          filterRules: config.Filter?.Key?.FilterRules,
        })
      })
    }

    pageData.value = items
  } catch (error) {
    console.error(error)
    pageData.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.bucketName,
  async newVal => {
    if (!newVal) {
      pageData.value = []
      return
    }
    await refresh()
  },
  { immediate: true }
)

const handleRefresh = () => {
  refresh()
}

const handleRowDelete = async (row: NotificationItem, event?: Event) => {
  event?.stopPropagation()

  const confirmed = await new Promise<boolean>(resolve => {
    dialog.warning({
      title: t('Confirm Delete'),
      content: t('Are you sure you want to delete this notification configuration?'),
      positiveText: t('Delete'),
      negativeText: t('Cancel'),
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    })
  })

  if (!confirmed) return

  try {
    loading.value = true

    if (!props.bucketName) return

    const currentResponse = await listBucketNotifications(props.bucketName)
    const currentNotifications = currentResponse || {}

    let updatedConfigurations: any[] = []

    // Helper to filter out the deleted config
    const filterConfig = (configs: any[]) => configs.filter((config: any) => config.Id !== row.id)

    const newNotificationConfig: any = { ...currentNotifications }

    if (row.type === 'Lambda' && currentNotifications.LambdaFunctionConfigurations) {
      newNotificationConfig.LambdaFunctionConfigurations = filterConfig(
        currentNotifications.LambdaFunctionConfigurations
      )
    } else if (row.type === 'SQS' && currentNotifications.QueueConfigurations) {
      newNotificationConfig.QueueConfigurations = filterConfig(currentNotifications.QueueConfigurations)
    } else if (row.type === 'SNS' && currentNotifications.TopicConfigurations) {
      newNotificationConfig.TopicConfigurations = filterConfig(currentNotifications.TopicConfigurations)
    }

    await putBucketNotifications(props.bucketName, newNotificationConfig)

    message.success(t('Delete Success'))
    await refresh()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  } finally {
    loading.value = false
  }
}

const newRef = ref<{ open: () => void }>()
const handleNew = () => {
  newRef.value?.open()
}
</script>
