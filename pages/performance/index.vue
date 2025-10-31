<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Server Information') }}</h1>
      <template #actions>
        <ActionBar>
          <Button variant="outline" @click="getPageData">
            <Icon name="ri:refresh-line" class="mr-2 size-4" />
            {{ t('Sync') }}
          </Button>
        </ActionBar>
      </template>
    </page-header>

    <div class="space-y-8">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card v-for="metric in summaryMetrics" :key="metric.label" class="shadow-none">
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              {{ metric.label }}
            </CardTitle>
            <Icon :name="metric.icon" class="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-semibold text-foreground">
              {{ metric.display }}
            </p>
            <p v-if="metric.caption" class="text-xs text-muted-foreground mt-1">
              {{ metric.caption }}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card class="shadow-none">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle>{{ t('Usage Report') }}</CardTitle>
            <span class="text-sm text-muted-foreground"> {{ t('Last Scan Activity') }}: {{ lastUpdatedLabel }} </span>
          </div>
          <CardDescription>
            {{ t('Monitor overall storage usage and recent scanner activity at a glance.') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4">
              <Icon name="ri:database-2-line" class="size-6 text-primary" />
              <div>
                <p class="text-sm text-muted-foreground">{{ t('Used Capacity') }}</p>
                <p class="text-2xl font-semibold text-foreground">
                  {{ niceBytes(datausageinfo.total_used_capacity) }}
                </p>
              </div>
            </div>
            <div class="w-full max-w-xs space-y-2">
              <Progress :model-value="usedPercent" class="h-2" />
              <p class="text-xs text-muted-foreground text-right">{{ usedPercent.toFixed(0) }}%</p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div v-for="item in usageStats" :key="item.label" class="rounded-lg border bg-muted/40 p-4">
              <p class="text-xs text-muted-foreground uppercase">
                {{ item.label }}
              </p>
              <p class="mt-2 text-sm font-medium text-foreground">
                {{ item.value }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="shadow-none">
        <CardHeader class="pb-3">
          <CardTitle>{{ t('Infrastructure Health') }}</CardTitle>
          <CardDescription>
            {{ t('Real-time status of cluster servers and backend storage devices.') }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-lg border bg-muted/40 p-4">
              <p class="text-sm font-medium text-muted-foreground">{{ t('Servers') }}</p>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-md border bg-background p-3">
                  <p class="text-xs text-muted-foreground">{{ t('Online') }}</p>
                  <p class="mt-1 text-xl font-semibold text-foreground">{{ onlineServers }}</p>
                </div>
                <div class="rounded-md border bg-background p-3">
                  <p class="text-xs text-muted-foreground">{{ t('Offline') }}</p>
                  <p class="mt-1 text-xl font-semibold text-foreground">{{ offlineServers }}</p>
                </div>
              </div>
            </div>
            <div class="rounded-lg border bg-muted/40 p-4">
              <p class="text-sm font-medium text-muted-foreground">{{ t('Disks') }}</p>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-md border bg-background p-3">
                  <p class="text-xs text-muted-foreground">{{ t('Online') }}</p>
                  <p class="mt-1 text-xl font-semibold text-foreground">
                    {{ systemInfo?.backend?.onlineDisks ?? 0 }}
                  </p>
                </div>
                <div class="rounded-md border bg-background p-3">
                  <p class="text-xs text-muted-foreground">{{ t('Offline') }}</p>
                  <p class="mt-1 text-xl font-semibold text-foreground">
                    {{ systemInfo?.backend?.offlineDisks ?? 0 }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="shadow-none">
        <CardHeader>
          <CardTitle>{{ t('Backend Services') }}</CardTitle>
          <CardDescription>
            {{ t('Key services and configuration values reported by the cluster.') }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card v-for="item in backendInfo" :key="item.title" class="border bg-muted/40 shadow-none">
              <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">
                  {{ item.title }}
                </CardTitle>
                <Icon :name="item.icon" class="size-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p class="text-xl font-semibold text-foreground">
                  {{ item.value ?? '-' }}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card class="shadow-none">
        <CardHeader class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{{ t('Server List') }}</CardTitle>
            <CardDescription>
              {{ t('Inspect individual server health, disk utilization, and network status.') }}
            </CardDescription>
          </div>
          <span class="text-sm text-muted-foreground"> {{ t('Total') }}: {{ serverInfo.count ?? 0 }} </span>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible class="space-y-2">
            <AccordionItem
              v-for="(server, index) in systemInfo?.servers || []"
              :key="server.endpoint"
              :value="String(index)"
            >
              <AccordionTrigger>
                <div class="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4">
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex h-2 w-2 rounded-full"
                      :class="server.state === 'online' ? 'bg-emerald-500' : 'bg-rose-500'"
                    />
                    <span class="font-semibold">{{ server.endpoint }}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span> {{ t('Disks') }}: {{ countOnlineDrives(server, 'ok') }} / {{ server.drives.length }} </span>
                    <span>
                      {{ t('Network') }}: {{ countOnlineNetworks(server, 'online') }} /
                      {{ Object.keys(server.network).length }}
                    </span>
                    <span> {{ t('Uptime') }}: {{ dayjs().subtract(server.uptime, 'second').toNow() }} </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p class="pb-2 text-xs text-muted-foreground">{{ t('Version') }}: {{ server.version }}</p>
                <ScrollArea class="w-full">
                  <div class="flex gap-4 pb-2">
                    <Card v-for="drive in server.drives" :key="drive.uuid" class="min-w-[260px] shadow-none">
                      <CardHeader class="pb-2">
                        <CardTitle class="text-sm font-medium text-muted-foreground">
                          {{ drive.drive_path }}
                        </CardTitle>
                        <CardDescription class="text-xs">
                          {{ niceBytes(drive.usedspace) }} / {{ niceBytes(drive.totalspace) }}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Progress
                          :model-value="drive.totalspace ? (drive.usedspace / drive.totalspace) * 100 : 0"
                          class="mb-3 h-2"
                        />
                        <div class="space-y-1 text-xs text-muted-foreground">
                          <p>
                            {{ t('Used') }}:
                            <span class="font-medium text-foreground">
                              {{ niceBytes(drive.usedspace) }}
                            </span>
                          </p>
                          <p>
                            {{ t('Available') }}:
                            <span class="font-medium text-foreground">
                              {{ niceBytes(drive.availspace) }}
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  </page>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Progress from '@/components/ui/progress/Progress.vue'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { niceBytes } from '@/utils/functions'
import dayjs from 'dayjs'
import en from 'dayjs/locale/en'
import zhCn from 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const systemApi = useSystem()
const { $api } = useNuxtApp()

dayjs.extend(relativeTime)

const isChineseLocale = computed(() => locale.value === 'zh')

watch(
  locale,
  () => {
    dayjs.locale(isChineseLocale.value ? zhCn : en)
  },
  { immediate: true }
)

const metricsInfo = ref<Record<string, any>>({})
const systemInfo = ref<any>({})
const datausageinfo = ref<any>({})
const storageinfo = ref<any>({})
const serverInfo = ref<any>({})

const numberFormatter = new Intl.NumberFormat()

const usedPercent = computed(() => {
  const total = Number(datausageinfo.value.total_capacity || 0)
  if (!total) return 0
  const used = Number(datausageinfo.value.total_used_capacity || 0)
  return Math.min(100, Math.max(0, (used / total) * 100))
})

const lastUpdatedLabel = computed(() => {
  const last = metricsInfo.value?.aggregated?.scanner?.current_started
  const time = dayjs(last)
  return time.isValid() ? time.fromNow() : '--'
})

const summaryMetrics = computed(() => {
  const bucketCount = systemInfo.value?.buckets?.count ?? 0
  const objectCount = systemInfo.value?.objects?.count ?? 0
  const totalCapacity = datausageinfo.value?.total_capacity
  const usedCapacity = datausageinfo.value?.total_used_capacity

  return [
    {
      label: t('Storage Space'),
      display: numberFormatter.format(bucketCount),
      icon: 'ri:archive-line',
      caption: null,
    },
    {
      label: t('Objects'),
      display: numberFormatter.format(objectCount),
      icon: 'ri:stack-line',
      caption: null,
    },
    {
      label: t('Total Capacity'),
      display: totalCapacity ? niceBytes(String(totalCapacity)) : '--',
      icon: 'ri:hard-drive-2-line',
      caption: usedCapacity ? `${t('Used')}: ${niceBytes(String(usedCapacity))}` : null,
    },
  ]
})

const fromLsatStartTime = computed(() => {
  const times = metricsInfo.value?.aggregated?.scanner?.cycle_complete_times || []
  if (!times.length) return '--'
  const start = dayjs(times[times.length - 1])
  return dayjs().from(start)
})

const fromLastScanTime = computed(() => {
  const start = dayjs(metricsInfo.value?.aggregated?.scanner?.current_started)
  if (!start.isValid()) return '--'
  return dayjs().from(start)
})

const lastScanTime = computed(() => {
  const currentStart = dayjs(metricsInfo.value?.aggregated?.scanner?.current_started)
  const cycleTimes = metricsInfo.value?.aggregated?.scanner?.cycle_complete_times || []
  if (!currentStart.isValid()) return '--'
  const lastComplete = dayjs(cycleTimes[cycleTimes.length - 1])
  return lastComplete.isValid() && currentStart.isBefore(lastComplete)
    ? lastComplete.from(currentStart)
    : dayjs().from(currentStart)
})

const usageStats = computed(() => [
  {
    icon: 'ri:signal-wifi-line',
    label: t('Last Normal Operation'),
    value: fromLsatStartTime.value,
  },
  {
    icon: 'ri:scan-line',
    label: t('Last Scan Activity'),
    value: fromLastScanTime.value,
  },
  {
    icon: 'ri:time-line',
    label: t('Uptime'),
    value: lastScanTime.value,
  },
])

const onlineServers = computed(
  () => (systemInfo.value?.servers || []).filter((server: any) => server.state === 'online').length
)

const offlineServers = computed(
  () => (systemInfo.value?.servers || []).filter((server: any) => server.state === 'offline').length
)

const countOnlineNetworks = (info: any, type: string) =>
  Object.values(info?.network || {}).filter((state: any) => state === type).length

const countOnlineDrives = (info: any, type: string) =>
  (info?.drives || []).filter((drive: any) => drive.state === type).length

const backendInfo = computed(() => [
  {
    icon: 'ri:archive-drawer-fill',
    title: t('Backend Type'),
    value: systemInfo.value?.backend?.backendType,
  },
  {
    icon: 'ri:secure-payment-fill',
    title: t('Standard Storage Parity'),
    value: storageinfo.value.backend?.StandardSCParity,
  },
  {
    icon: 'ri:list-settings-fill',
    title: t('Reduced Redundancy Parity'),
    value: storageinfo.value.backend?.RRSCParity,
  },
])

const getMetricsInfo = async () => {
  const url = '/metrics'
  const options = { method: 'GET' }

  for await (const data of $api.streamRequest(url, options)) {
    metricsInfo.value = { ...metricsInfo.value, ...data }
  }
}

const getSystemInfo = async () => {
  const res: any = await systemApi.getSystemInfo()
  systemInfo.value = res
}

const getDataUsageInfo = async () => {
  const res = await systemApi.getDataUsageInfo()
  datausageinfo.value = res
}

const getStorageInfo = async () => {
  const res = await systemApi.getStorageInfo()
  storageinfo.value = res
}

const getServerInfo = async () => {
  const serverList = systemInfo.value?.servers || []
  serverInfo.value.count = serverList.length
}

const getPageData = async () => {
  await getSystemInfo()
  await getServerInfo()
  await getDataUsageInfo()
  await getStorageInfo()
  await getMetricsInfo()
}

getPageData()
</script>
