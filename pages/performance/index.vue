<template>
  <page-header>
    <template #title>
      <h1 class="text-2xl font-bold">{{ t('Server Information') }}</h1>
    </template>
    <template #actions>
      <NFlex>
        <NButton secondary @click="getPageData">
          <template #icon>
            <Icon name="ri:refresh-line"></Icon>
          </template>
          {{ t('Sync') }}
        </NButton>
      </NFlex>
    </template>
  </page-header>
  <page-content>
    <n-flex :wrap="false">
      <n-flex vertical class="basis-2/3">
        <n-flex class="flex-no-wrap">
          <!-- 存储空间 -->
          <n-card :title="t('Storage Space')" class="flex-1">
            <n-statistic label="" :value="systemInfo?.buckets?.count"></n-statistic>
          </n-card>

          <!-- 对象 -->
          <n-card :title="t('Objects')" class="flex-1">
            <n-statistic label="" :value="systemInfo?.objects?.count" />
          </n-card>
        </n-flex>

        <n-flex class="flex-no-wrap flex-auto">
          <!-- 服务器 -->
          <n-card :title="t('Servers')" class="flex-1">
            <n-flex>
              <n-row>
                <n-col :span="12">
                  <n-statistic :label="t('Online')" :value="onlineServers">
                    <template #prefix>
                      <n-badge type="success" dot />
                    </template>
                  </n-statistic>
                </n-col>
                <n-col :span="12">
                  <n-statistic :label="t('Offline')" :value="offlineServers">
                    <template #prefix>
                      <n-badge dot />
                    </template>
                  </n-statistic>
                </n-col>
              </n-row>
            </n-flex>
          </n-card>

          <!-- 磁盘 -->
          <n-card :title="t('Disks')" class="flex-1">
            <n-flex>
              <n-row>
                <n-col :span="12">
                  <n-statistic :label="t('Online')" :value="systemInfo?.backend?.onlineDisks">
                    <template #prefix>
                      <n-badge type="success" dot />
                    </template>
                  </n-statistic>
                </n-col>
                <n-col :span="12">
                  <n-statistic :label="t('Offline')" :value="systemInfo?.backend?.offlineDisks">
                    <template #prefix>
                      <n-badge dot />
                    </template>
                  </n-statistic>
                </n-col>
              </n-row>
            </n-flex>
          </n-card>
        </n-flex>
      </n-flex>
      <n-flex vertical :size="20" class="basis-1/3">
        <n-card :title="t('Usage Report')" :bordered="false" class="report-card">
          <n-flex :size="20" justify="space-between" align="center">
            <span class="text-3xl font-bold">{{ niceBytes(datausageinfo.total_used_capacity) }}</span>
            <n-progress
              style="margin: 0 8px 12px 0; width: 90px"
              type="circle"
              :percentage="Math.round((datausageinfo.total_used_capacity / datausageinfo.total_capacity) * 100)"
              :color="themeVars.infoColor"
              :rail-color="changeColor(themeVars.infoColor, { alpha: 0.2 })"
              :indicator-text-color="themeVars.infoColor"
            >
              <span style="text-align: center"></span>
            </n-progress>
          </n-flex>
          <n-list>
            <n-list-item>
              <n-thing>
                <template #avatar>
                  <Icon name="ri:signal-wifi-line" />
                </template>
                <template #header>{{ t('Last Normal Operation') }}</template>
                <template #header-extra>{{ fromLsatStartTime }}</template>
              </n-thing>
            </n-list-item>
            <n-list-item>
              <n-thing>
                <template #avatar>
                  <Icon name="ri:scan-line" />
                </template>
                <template #header>{{ t('Last Scan Activity') }}</template>
                <template #header-extra>{{ fromLastScanTime }}</template>
              </n-thing>
            </n-list-item>
            <n-list-item>
              <n-thing>
                <template #avatar>
                  <Icon name="ri:time-line" />
                </template>
                <template #header>{{ t('Uptime') }}</template>
                <template #header-extra>{{ lastScanTime }}</template>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-card>
      </n-flex>
    </n-flex>

    <n-list class="flex justify-between my-4 bg-transparent" :show-divider="false">
      <n-list-item class="basis-1/3 mx-2" style="background-color: var(--n-color)">
        <n-thing class="px-2">
          <template #avatar>
            <Icon name="ri:archive-drawer-fill" />
          </template>
          <template #header>{{ t('Backend Type') }}</template>
          <template #header-extra>{{ systemInfo?.backend?.backendType }}</template>
        </n-thing>
      </n-list-item>
      <n-list-item class="basis-1/3 mx-2" style="background-color: var(--n-color)">
        <n-thing class="px-2">
          <template #avatar>
            <div>
              <Icon name="ri:secure-payment-fill" />
            </div>
          </template>
          <template #header>{{ t('Standard Storage Parity') }}</template>
          <template #header-extra>
            {{ storageinfo.backend?.StandardSCParity }}
          </template>
        </n-thing>
      </n-list-item>
      <n-list-item class="basis-1/3 mx-2" style="background-color: var(--n-color)">
        <n-thing class="px-2">
          <template #avatar>
            <Icon name="ri:list-settings-fill" />
          </template>
          <template #header>{{ t('Reduced Redundancy Parity') }}</template>
          <template #header-extra>
            {{ storageinfo.backend?.RRSCParity }}
          </template>
        </n-thing>
      </n-list-item>
    </n-list>
    <n-space vertical :size="20">
      <n-card :title="`${t('Server List')}(${serverInfo.count})`" :bordered="false" class="server-list-card">
        <n-collapse :accordion="true" :default-expanded-names="1" class="server-list">
          <n-collapse-item
            v-for="(server, index) in systemInfo?.servers"
            :name="index + 1"
            :key="server.endpoint"
            :title="server.endpoint"
          >
            <template #header>
              <div class="flex justify-between align-items-center">
                <n-space>
                  <n-badge v-if="server.state == 'online'" type="success" dot />
                  <n-badge v-else dot />
                  <span class="font-bold align-middle me-4">{{ server.endpoint }}</span>
                  <span>
                    <n-badge type="success" dot />
                    <span class="align-middle ms-1 me-4">
                      {{ t('Disks') }}: {{ countOnlineDrives(server, 'ok') }} /
                      {{ server.drives.length }}
                    </span>
                  </span>
                  <span>
                    <n-badge type="success" dot />
                    <span class="align-middle ms-1 me-4">
                      {{ t('Network') }}: {{ countOnlineNetworks(server, 'online') }} /
                      {{ Object.keys(server.network).length }}
                    </span>
                  </span>
                  <span>
                    <n-badge type="success" dot />
                    <span class="align-middle ms-1">
                      {{ t('Uptime') }}: {{ dayjs().subtract(server.uptime, 'second').toNow() }}
                    </span>
                  </span>
                </n-space>
              </div>
            </template>
            <template #header-extra>{{ t('Version') }}: {{ server.version }}</template>
            <n-carousel
              :show-dots="false"
              :show-arrow="true"
              :autoplay="false"
              :slides-per-view="3"
              ref="driveCarouselRef"
              draggable
              class="drive-carousel"
              :space-between="20"
            >
              <n-carousel-item
                v-for="drive in server.drives"
                :key="drive.uuid"
                style="width: 350px"
                class="flex flex-col justify-start items-center p-4 border rounded mx-2 ml-0"
              >
                <div class="self-start ps-6">{{ drive.drive_path }}</div>
                <div class="flex w-full justify-around items-center my-8">
                  <n-progress
                    type="circle"
                    style="width: 140px"
                    :percentage="Math.round((drive.usedspace / drive.totalspace) * 100)"
                    size="small"
                  >
                    <span class="text-center">{{ niceBytes(drive.usedspace) }}</span>
                  </n-progress>
                  <div class="flex flex-col justify-between text-center">
                    <div class="text-lg">{{ niceBytes(drive.totalspace) }}</div>
                    <div class="mb-2">{{ t('Total Space') }}</div>
                    <div class="text-lg">{{ niceBytes(drive.usedspace) }}</div>
                    <div class="mb-2">{{ t('Used') }}</div>
                    <div class="text-lg">{{ niceBytes(drive.availspace) }}</div>
                    <div>{{ t('Available') }}</div>
                  </div>
                </div>
              </n-carousel-item>
            </n-carousel>
          </n-collapse-item>
        </n-collapse>
      </n-card>
    </n-space>
  </page-content>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs';
import zhCn from 'dayjs/locale/zh-cn';
import en from 'dayjs/locale/en';
import relativeTime from 'dayjs/plugin/relativeTime';
import { NButton, NCard, NCol, NProgress, NRow, NSpace, useThemeVars } from 'naive-ui';
import { changeColor } from 'seemly';
import { useI18n } from 'vue-i18n';
import { niceBytes } from '../../utils/functions';

const { t } = useI18n();
const themeVars = useThemeVars();
const systemApi = useSystem();
const poolsApi = usePools();
const { $api } = useNuxtApp();
dayjs.extend(relativeTime);
// 获取当前语言

const { locale } = useI18n();

const isChineseLocale = computed(() => {
  return locale.value === 'zh';
});
// 根据语言包设置 dayjs 的语言
watch(locale, () => {
  if (isChineseLocale.value) {
    dayjs.locale(zhCn);
  } else {
    dayjs.locale(en);
  }
});

const metricsInfo: any = ref({});
const getMetricsInfo = async () => {
  const url = '/metrics';
  const options = { method: 'GET' };

  for await (const data of $api.streamRequest(url, options)) {
    // 更新metricsInfo.value
    metricsInfo.value = { ...metricsInfo.value, ...data };
  }
};

// 距离上次正常运行
const fromLsatStartTime = computed(() => {
  const start = dayjs(
    metricsInfo.value?.aggregated?.scanner?.cycle_complete_times[
      metricsInfo.value?.aggregated?.scanner?.cycle_complete_times.length - 1
    ]
  );
  const end = dayjs();
  return end.from(start);
});

// 距离上次扫描活动
const fromLastScanTime = computed(() => {
  const start = dayjs(metricsInfo.value?.aggregated?.scanner?.current_started);
  const end = dayjs();
  return end.from(start);
});

// 运行时间
const lastScanTime = computed(() => {
  const start = dayjs(metricsInfo.value?.aggregated?.scanner?.current_started);
  const end = dayjs(
    metricsInfo.value?.aggregated?.scanner?.cycle_complete_times[
      metricsInfo.value?.aggregated?.scanner?.cycle_complete_times.length - 1
    ]
  );
  if (start < end) {
    return end.from(start);
  } else {
    return dayjs().from(start);
  }
});

const systemInfo: any = ref({});
const getSystemInfo = async () => {
  const res: any = await systemApi.getSystemInfo();
  systemInfo.value = res;
};

const datausageinfo: any = ref({});
const getdatausageinfo = async () => {
  const res = await systemApi.getDataUsageInfo();
  datausageinfo.value = res;
};

const storageinfo: any = ref({});
const getstorageinfo = async () => {
  const res = await systemApi.getStorageInfo();
  storageinfo.value = res;
};

const getPageData = async () => {
  await getSystemInfo();
  await getServerInfo();
  await getdatausageinfo();
  await getstorageinfo();
  await getMetricsInfo();
};
getPageData();

const serverInfo: any = ref({});
// 获取服务器信息
const getServerInfo = async () => {
  const serverList = systemInfo.value?.servers || [];
  serverInfo.value.count = serverList.length;
};

// 计算在线服务器
const onlineServers = computed(() => {
  return (
    systemInfo.value?.servers?.filter((server: any) => {
      return server.state === 'online';
    }).length || 0
  );
});
const offlineServers = computed(() => {
  return (
    systemInfo.value?.servers?.filter((server: any) => {
      return server.state === 'offline';
    }).length || 0
  );
});

// 计算网络状态数量
const countOnlineNetworks = (serverInfo: any, type: string) => {
  return (
    Object.values(serverInfo?.network)?.filter((server: any) => {
      return server === type;
    }).length || 0
  );
};

// 计算磁盘状态数量
const countOnlineDrives = (serverInfo: any, type: string) => {
  return (
    serverInfo?.drives?.filter((server: any) => {
      return server.state === type;
    }).length || 0
  );
};
</script>

<style scoped></style>
