<template>
  <page>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Events') }}</h1>
      </template>
      <template #actions>
        <Label for="bucket-select">{{ t('Bucket') }}</Label>
        <div class="max-w-xs flex-1">
          <Select id="bucket-select" v-model="bucketName" :disabled="!bucketList.length">
            <SelectTrigger>
              <SelectValue :placeholder="t('Please select bucket')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="bucket in bucketList" :key="bucket.value" :value="bucket.value">
                {{ bucket.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" @click="handleNew">
          <Icon class="size-4" name="ri:add-line" />
          <span>{{ t('Add Event Subscription') }}</span>
        </Button>
        <Button type="button" variant="secondary" @click="handleRefresh" :disabled="loading">
          <Icon class="size-4" name="ri:refresh-line" />
          <span>{{ t('Refresh') }}</span>
        </Button>
      </template>
    </page-header>

    <div class="space-y-6">
      <div class="relative">
        <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center rounded-lg border bg-background/70 backdrop-blur-sm">
          <Spinner class="size-6 text-muted-foreground" />
        </div>

        <div v-if="pageData.length" class="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-28">{{ t('Type') }}</TableHead>
                <TableHead class="min-w-[180px]">{{ t('ARN') }}</TableHead>
                <TableHead class="w-52">{{ t('Events') }}</TableHead>
                <TableHead class="w-36">{{ t('Prefix') }}</TableHead>
                <TableHead class="w-36">{{ t('Suffix') }}</TableHead>
                <TableHead class="w-24 text-center">{{ t('Actions') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in pageData" :key="row.id">
                <TableCell>
                  <Badge :class="typeBadgeClasses[row.type]">
                    {{ row.type }}
                  </Badge>
                </TableCell>
                <TableCell class="font-medium">
                  <span class="line-clamp-2 break-all">{{ row.arn }}</span>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    <Badge v-for="event in getDisplayEvents(row.events)" :key="event" variant="secondary">
                      {{ event }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{{ row.prefix || '-' }}</TableCell>
                <TableCell>{{ row.suffix || '-' }}</TableCell>
                <TableCell>
                  <div class="flex justify-center">
                    <Button type="button" size="sm" variant="secondary" class="gap-2" @click="event => handleRowDelete(row, event)">
                      <Icon class="size-4" name="ri:delete-bin-7-line" />
                      {{ t('Delete') }}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Card v-else class="relative">
          <CardContent class="py-16">
            <Empty class="mx-auto max-w-sm text-center">
              <EmptyHeader>
                <EmptyTitle>{{ t('No Data') }}</EmptyTitle>
                <EmptyDescription>{{ t('Add Event Subscription to get started') }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>

      <events-new-form ref="newRef" :bucketName="bucketName" @success="refresh" />
    </div>
  </page>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { listBuckets, listBucketNotifications, putBucketNotifications } = useBucket({})
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
  's3:0bjectCreated:*': 'PUT',
  's3:0bjectAccessed:*': 'GET',
  's3:0bjectRemoved:*': 'DELETE',
  's3:Replication:*': 'REPLICA',
  's3:ObjectRestore:*': 'RESTORE',
  's3:0bjectTransition:*': 'RESTORE',
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

const { data } = await useAsyncData(
  'buckets',
  async () => {
    const response = await listBuckets()
    return (
      response.Buckets?.sort((a: any, b: any) => {
        return a.Name.localeCompare(b.Name)
      }) || []
    )
  },
  { default: () => [] },
)

const bucketList = computed(() => {
  return data.value.map((bucket: any) => ({
    label: bucket.Name,
    value: bucket.Name,
  }))
})

const bucketName = ref<string>(bucketList.value.length > 0 ? bucketList.value[0]?.value ?? '' : '')
const loading = ref(false)
const pageData = ref<NotificationItem[]>([])

watch(
  () => bucketName.value,
  async newVal => {
    if (!newVal) {
      pageData.value = []
      return
    }

    await refresh()
  },
  { immediate: true },
)

watch(
  () => bucketList.value,
  newBuckets => {
    if (!bucketName.value && newBuckets.length) {
      const firstBucket = newBuckets[0]
      if (firstBucket?.value) {
        bucketName.value = firstBucket.value
      }
    }
  },
)

const handleRowDelete = async (row: NotificationItem, event: Event) => {
  event.stopPropagation()

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

    const currentResponse = await listBucketNotifications(bucketName.value)
    const currentNotifications = currentResponse || {}

    let updatedConfigurations: any[] = []

    if (row.type === 'Lambda' && currentNotifications.LambdaFunctionConfigurations) {
      updatedConfigurations = currentNotifications.LambdaFunctionConfigurations.filter(
        (config: any) => config.Id !== row.id,
      )
    } else if (row.type === 'SQS' && currentNotifications.QueueConfigurations) {
      updatedConfigurations = currentNotifications.QueueConfigurations.filter(
        (config: any) => config.Id !== row.id,
      )
    } else if (row.type === 'SNS' && currentNotifications.TopicConfigurations) {
      updatedConfigurations = currentNotifications.TopicConfigurations.filter(
        (config: any) => config.Id !== row.id,
      )
    }

    const newNotificationConfig = {
      ...currentNotifications,
    }

    if (row.type === 'Lambda') {
      newNotificationConfig.LambdaFunctionConfigurations = updatedConfigurations
    } else if (row.type === 'SQS') {
      newNotificationConfig.QueueConfigurations = updatedConfigurations
    } else if (row.type === 'SNS') {
      newNotificationConfig.TopicConfigurations = updatedConfigurations
    }

    await putBucketNotifications(bucketName.value, newNotificationConfig)

    message.success(t('Delete Success'))
    await refresh()
  } catch (error: any) {
    console.error('删除通知配置失败:', error)
    message.error(`${t('Delete Failed')}: ${error.message || error}`)
  } finally {
    loading.value = false
  }
}

const newRef = ref()

const handleNew = () => {
  newRef.value?.open()
}

const handleRefresh = async () => {
  await refresh()
}

const refresh = async () => {
  loading.value = true
  if (!bucketName.value) {
    pageData.value = []
    loading.value = false
    return
  }

  try {
    const response = await listBucketNotifications(bucketName.value)
    const notifications: NotificationItem[] = []

    if (response.LambdaFunctionConfigurations) {
      response.LambdaFunctionConfigurations.forEach((config: any) => {
        const prefix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Prefix')?.Value
        const suffix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Suffix')?.Value

        notifications.push({
          id: config.Id,
          type: 'Lambda',
          arn: config.LambdaFunctionArn,
          events: config.Events || [],
          prefix,
          suffix,
          filterRules: config.Filter?.Key?.FilterRules || [],
        })
      })
    }

    if (response.QueueConfigurations) {
      response.QueueConfigurations.forEach((config: any) => {
        const prefix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Prefix')?.Value
        const suffix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Suffix')?.Value

        notifications.push({
          id: config.Id,
          type: 'SQS',
          arn: config.QueueArn,
          events: config.Events || [],
          prefix,
          suffix,
          filterRules: config.Filter?.Key?.FilterRules || [],
        })
      })
    }

    if (response.TopicConfigurations) {
      response.TopicConfigurations.forEach((config: any) => {
        const prefix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Prefix')?.Value
        const suffix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Suffix')?.Value

        notifications.push({
          id: config.Id,
          type: 'SNS',
          arn: config.TopicArn,
          events: config.Events || [],
          prefix,
          suffix,
          filterRules: config.Filter?.Key?.FilterRules || [],
        })
      })
    }

    pageData.value = notifications
  } catch (error) {
    console.error('获取通知配置失败:', error)
    pageData.value = []
  } finally {
    loading.value = false
  }
}
</script>
