<template>
  <page>
    <page-header>
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold">{{ t('Bucket') }}: {{ bucketName }}</h1>
      </div>
    </page-header>

    <Tabs default-value="overview" class="w-full space-y-6">
      <TabsList
        class="w-auto inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
      >
        <TabsTrigger value="overview" class="px-4">
          {{ t('Overview') }}
        </TabsTrigger>
        <template v-if="hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_LIFECYCLE)">
          <TabsTrigger value="lifecycle" class="px-4">
            {{ t('Lifecycle') }}
          </TabsTrigger>
        </template>
        <template v-if="hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_REPLICATION)">
          <TabsTrigger value="replication" class="px-4">
            {{ t('Replication') }}
          </TabsTrigger>
        </template>
        <template v-if="hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_EVENTS)">
          <TabsTrigger value="events" class="px-4">
            {{ t('Events') }}
          </TabsTrigger>
        </template>
      </TabsList>

      <TabsContent value="overview" class="space-y-4 outline-none">
        <buckets-info :bucket="bucketName" />
      </TabsContent>

      <template v-if="hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_LIFECYCLE)">
        <TabsContent value="lifecycle" class="space-y-4 outline-none">
          <LifecycleConfig :bucketName="bucketName" />
        </TabsContent>
      </template>

      <template v-if="hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_REPLICATION)">
        <TabsContent value="replication" class="space-y-4 outline-none">
          <ReplicationConfig :bucketName="bucketName" />
        </TabsContent>
      </template>

      <template v-if="hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_EVENTS)">
        <TabsContent value="events" class="space-y-4 outline-none">
          <EventsConfig :bucketName="bucketName" />
        </TabsContent>
      </template>
    </Tabs>
  </page>
</template>

<script lang="ts" setup>
import { useRoute } from '#app'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BucketsInfo from '@/components/buckets/info.vue'
import ReplicationConfig from '@/components/replication/ReplicationConfig.vue'
import LifecycleConfig from '@/components/lifecycle/LifecycleConfig.vue'
import EventsConfig from '@/components/events/EventsConfig.vue'
import { CONSOLE_SCOPES } from '~/utils/console-permissions'

const { t } = useI18n()
const { hasPermission } = usePermissions()
const route = useRoute()
const bucketName = computed(() => decodeURIComponent(route.params.key as string))
</script>
