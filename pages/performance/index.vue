<template>
  <page-header>
    <template #title>
      <h1 class="text-2xl font-bold">{{ t('Server Information') }}</h1>
    </template>
    <template #actions>
      <AppButton variant="outline" @click="getPageData">
        <Icon name="ri:refresh-line" class="mr-2 size-4" />
        {{ t('Sync') }}
      </AppButton>
    </template>
  </page-header>

  <page-content>
    <div class="grid gap-4 lg:grid-cols-3">
      <AppCard class="space-y-1">
        <p class="text-sm text-muted-foreground">{{ t('Storage Space') }}</p>
        <p class="text-2xl font-semibold">{{ systemInfo?.buckets?.count ?? 0 }}</p>
      </AppCard>
      <AppCard class="space-y-1">
        <p class="text-sm text-muted-foreground">{{ t('Objects') }}</p>
        <p class="text-2xl font-semibold">{{ systemInfo?.objects?.count ?? 0 }}</p>
      </AppCard>
      <AppCard class="space-y-3">
        <p class="text-sm font-medium text-muted-foreground">{{ t('Usage Report') }}</p>
        <div class="flex items-center justify-between gap-4">
          <span class="text-3xl font-semibold">{{ niceBytes(datausageinfo.total_used_capacity) }}</span>
          <div class="w-32 space-y-2">
            <AppProgress :value="usedPercent" />
            <p class="text-xs text-muted-foreground text-right">{{ usedPercent.toFixed(0) }}%</p>
          </div>
        </div>
        <div class="space-y-3">
          <div v-for="item in usageStats" :key="item.label" class="flex items-start gap-3 rounded-lg border border-border/60 p-3">
            <Icon :name="item.icon" class="size-5 text-muted-foreground" />
            <div class="flex-1">
              <p class="text-sm font-medium text-foreground">{{ item.label }}</p>
              <p class="text-xs text-muted-foreground">{{ item.value }}</p>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-2">
      <AppCard class="space-y-4">
        <p class="text-sm font-medium text-muted-foreground">{{ t('Servers') }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-border/60 p-4">
            <p class="text-sm text-muted-foreground">{{ t('Online') }}</p>
            <p class="text-2xl font-semibold">{{ onlineServers }}</p>
          </div>
          <div class="rounded-lg border border-border/60 p-4">
            <p class="text-sm text-muted-foreground">{{ t('Offline') }}</p>
            <p class="text-2xl font-semibold">{{ offlineServers }}</p>
          </div>
        </div>
      </AppCard>
      <AppCard class="space-y-4">
        <p class="text-sm font-medium text-muted-foreground">{{ t('Disks') }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-border/60 p-4">
            <p class="text-sm text-muted-foreground">{{ t('Online') }}</p>
            <p class="text-2xl font-semibold">{{ systemInfo?.backend?.onlineDisks ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-border/60 p-4">
            <p class="text-sm text-muted-foreground">{{ t('Offline') }}</p>
            <p class="text-2xl font-semibold">{{ systemInfo?.backend?.offlineDisks ?? 0 }}</p>
          </div>
        </div>
      </AppCard>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <div
        v-for="item in backendInfo"
        :key="item.title"
        class="rounded-lg border border-border/60 p-4"
      >
        <div class="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Icon :name="item.icon" class="size-5" />
          <span>{{ item.title }}</span>
        </div>
        <p class="mt-3 text-xl font-semibold text-foreground">{{ item.value ?? '-' }}</p>
      </div>
    </div>

    <AppCard class="mt-6 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-base font-semibold">
          {{ t('Server List') }} ({{ serverInfo.count ?? 0 }})
        </p>
      </div>
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
                <span>
                  {{ t('Disks') }}: {{ countOnlineDrives(server, 'ok') }} / {{ server.drives.length }}
                </span>
                <span>
                  {{ t('Network') }}: {{ countOnlineNetworks(server, 'online') }} /
                  {{ Object.keys(server.network).length }}
                </span>
                <span>
                  {{ t('Uptime') }}: {{ dayjs().subtract(server.uptime, 'second').toNow() }}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p class="pb-2 text-xs text-muted-foreground">{{ t('Version') }}: {{ server.version }}</p>
            <ScrollArea class="w-full">
              <div class="flex gap-4 pb-2">
                <div
                  v-for="drive in server.drives"
                  :key="drive.uuid"
                  class="min-w-[260px] rounded-lg border border-border/60 p-4"
                >
                  <p class="text-sm font-medium text-muted-foreground">{{ drive.drive_path }}</p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ niceBytes(drive.usedspace) }} / {{ niceBytes(drive.totalspace) }}
                  </p>
                  <AppProgress :value="drive.totalspace ? (drive.usedspace / drive.totalspace) * 100 : 0" class="mt-3" />
                  <div class="mt-3 text-xs text-muted-foreground">
                    <p>
                      {{ t('Used') }}: <span class="font-medium text-foreground">{{ niceBytes(drive.usedspace) }}</span>
                    </p>
                    <p>
                      {{ t('Available') }}:
                      <span class="font-medium text-foreground">{{ niceBytes(drive.availspace) }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </AppCard>
  </page-content>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import zhCn from 'dayjs/locale/zh-cn'
import en from 'dayjs/locale/en'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Icon } from '#components'
import { AppButton, AppCard, AppProgress } from '@/components/app'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { niceBytes } from '@/utils/functions'

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

const usedPercent = computed(() => {
  const total = Number(datausageinfo.value.total_capacity || 0)
  if (!total) return 0
  const used = Number(datausageinfo.value.total_used_capacity || 0)
  return Math.min(100, Math.max(0, (used / total) * 100))
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

const onlineServers = computed(() =>
  (systemInfo.value?.servers || []).filter((server: any) => server.state === 'online').length
)

const offlineServers = computed(() =>
  (systemInfo.value?.servers || []).filter((server: any) => server.state === 'offline').length
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

<script lang="ts">
export default {
  components: {
    AppCard,
  },
}
</script>
