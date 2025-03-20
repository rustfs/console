<template>
  <page-header>
    <template #title>
      <h1 class="text-2xl font-bold">服务器信息</h1>
    </template>
    <template #actions>
      <NFlex>
        <NButton secondary @click="getPageData">
          <template #icon>
            <Icon name="ri:refresh-line"></Icon>
          </template>
          同步
        </NButton>
      </NFlex>
    </template>
  </page-header>
  <page-content>
    <n-flex :wrap="false">
      <n-flex vertical class="basis-2/3">
        <n-flex class="flex-no-wrap">
          <!-- 存储空间 -->
          <n-card title="存储空间" class="flex-1">
            <n-statistic label="" :value="systemInfo?.buckets?.count"></n-statistic>
          </n-card>

          <!-- 对象 -->
          <n-card title="对象" class="flex-1">
            <n-statistic label="" :value="systemInfo?.objects?.count" />
          </n-card>
        </n-flex>

        <n-flex class="flex-no-wrap flex-auto">
          <!-- 服务器 -->
          <n-card title="服务器" class="flex-1">
            <n-flex>
              <n-row>
                <n-col :span="12">
                  <n-statistic label="在线" :value="onlineServers">
                    <template #prefix>
                      <n-badge type="success" dot />
                    </template>
                  </n-statistic>
                </n-col>
                <n-col :span="12">
                  <n-statistic label="离线" :value="offlineServers">
                    <template #prefix>
                      <n-badge dot />
                    </template>
                  </n-statistic>
                </n-col>
              </n-row>
            </n-flex>
          </n-card>

          <!-- 磁盘 -->
          <n-card title="磁盘" class="flex-1">
            <n-flex>
              <n-row>
                <n-col :span="12">
                  <n-statistic label="在线" :value="systemInfo?.backend?.onlineDisks">
                    <template #prefix>
                      <n-badge type="success" dot />
                    </template>
                  </n-statistic>
                </n-col>
                <n-col :span="12">
                  <n-statistic label="离线" :value="systemInfo?.backend?.offlineDisks">
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
        <n-card title="用户情况报告" :bordered="false" class="report-card">
          <n-flex :size="20" justify="space-between" align="center">
            <span class="text-3xl font-bold">292 MiB</span>
            <n-progress
              style="margin: 0 8px 12px 0; width: 90px"
              type="circle"
              :percentage="20"
              :color="themeVars.infoColor"
              :rail-color="changeColor(themeVars.infoColor, { alpha: 0.2 })"
              :indicator-text-color="themeVars.infoColor">
              <span style="text-align: center"></span>
            </n-progress>
          </n-flex>
          <n-list>
            <n-list-item>
              <n-thing>
                <template #avatar>
                  <Icon name="ri:signal-wifi-line" />
                </template>
                <template #header>距离上次 正常运行</template>
                <template #header-extra>n/a</template>
              </n-thing>
            </n-list-item>
            <n-list-item>
              <n-thing>
                <template #avatar>
                  <Icon name="ri:scan-line" />
                </template>
                <template #header>距离上次 扫描活动</template>
                <template #header-extra>n/a</template>
              </n-thing>
            </n-list-item>
            <n-list-item>
              <n-thing>
                <template #avatar>
                  <Icon name="ri:time-line" />
                </template>
                <template #header>运行时间</template>
                <template #header-extra>n/a</template>
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
            <Icon name="ri:signal-wifi-line" />
          </template>
          <template #header>距离上次 正常运行</template>
          <template #header-extra>n/a</template>
        </n-thing>
      </n-list-item>
      <n-list-item class="basis-1/3 mx-2" style="background-color: var(--n-color)">
        <n-thing class="px-2">
          <template #avatar>
            <div><Icon name="ri:scan-line" /></div>
          </template>
          <template #header>距离上次 扫描活动</template>
          <template #header-extra>n/a</template>
        </n-thing>
      </n-list-item>
      <n-list-item class="basis-1/3 mx-2" style="background-color: var(--n-color)">
        <n-thing class="px-2">
          <template #avatar>
            <Icon name="ri:time-line" />
          </template>
          <template #header>运行时间</template>
          <template #header-extra>n/a</template>
        </n-thing>
      </n-list-item>
    </n-list>
    <n-space vertical :size="20">
      <n-card :title="`服务器列表(${serverInfo.count})`" :bordered="false" class="server-list-card">
        <n-collapse>
          <n-collapse-item v-for="server in systemInfo?.servers" :key="server.endpoint" :title="server.endpoint">
            <template #header>
              <div class="flex justify-between align-items-center">
                <n-space>
                  <n-badge type="success" dot />
                  <span class="font-bold">{{ server.endpoint }}</span>
                  <span>
                    <n-badge type="success" dot />
                    磁盘:{{ countOnlineDrives(server, "ok") }} / {{ server.drives.length }}
                  </span>
                  <span>
                    <n-badge type="success" dot />
                    网络: {{ countOnlineNetworks(server, "online") }} / {{ Object.keys(server.network).length }}
                  </span>
                  <span>
                    <n-badge type="success" dot />
                    运行时间: {{ dayjs(server.uptime).format("YYYY-MM-DD HH:mm:ss") }}
                  </span>
                </n-space>
              </div>
            </template>
            <template #header-extra>版本: 2024-03-24T03:47</template>
            <n-carousel
              :show-dots="false"
              :show-arrow="true"
              :autoplay="false"
              slides-per-view="auto"
              draggable
              class="drive-carousel"
              :space-between="20">
              <n-carousel-item
                v-for="drive in server.drives"
                :key="drive.uuid"
                style="width: 350px"
                class="flex flex-col items-center p-4 border rounded mx-2 ml-0">
                <div class="self-start ps-6">{{ drive.drive_path }}</div>
                <div class="flex w-full justify-around items-center my-8">
                  <n-progress
                    type="circle"
                    style="width: 140px"
                    :percentage="Math.round((drive.used_space / drive.total_space) * 100)"
                    size="small">
                    <span class="text-center">{{ niceBytes(drive.used_space) }}</span>
                  </n-progress>
                  <div class="flex flex-col justify-between text-center">
                    <div class="text-lg">{{ niceBytes(drive.total_space) }}</div>
                    <div class="mb-2">总容量</div>
                    <div class="text-lg">{{ niceBytes(drive.used_space) }}</div>
                    <div class="mb-2">已使用</div>
                    <div class="text-lg">{{ niceBytes(drive.available_space) }}</div>
                    <div>可用</div>
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
import { useThemeVars } from "naive-ui"
import { changeColor } from "seemly"
import { NButton, NCard, NCol, NProgress, NRow, NSpace, NTag, NDivider } from "naive-ui"
const themeVars = useThemeVars()
const systemApi = useSystem()
const poolsApi = usePools()
import dayjs from "dayjs"
import { niceBytes } from "../../utils/functions"

const systemInfo: any = ref({})
const getSystemInfo = async () => {
  const res = await systemApi.getSystemInfo()
  systemInfo.value = res
}

const getPageData = async () => {
  await getSystemInfo()
  await getServerInfo()
}
getPageData()

const serverInfo: any = ref({})
// 获取服务器信息
const getServerInfo = async () => {
  const serverList = systemInfo.value?.servers || []
  serverInfo.value.count = serverList.length
}

// 计算在线服务器
const onlineServers = computed(() => {
  return (
    systemInfo.value?.servers?.filter((server: any) => {
      return server.state === "online"
    }).length || 0
  )
})
const offlineServers = computed(() => {
  return (
    systemInfo.value?.servers?.filter((server: any) => {
      return server.state === "offline"
    }).length || 0
  )
})

// 计算网络状态数量
const countOnlineNetworks = (serverInfo: any, type: string) => {
  return (
    Object.values(serverInfo?.network)?.filter((server: any) => {
      return server === type
    }).length || 0
  )
}

// 计算磁盘状态数量
const countOnlineDrives = (serverInfo: any, type: string) => {
  return (
    serverInfo?.drives?.filter((server: any) => {
      return server.state === type
    }).length || 0
  )
}
</script>

<style scoped></style>
