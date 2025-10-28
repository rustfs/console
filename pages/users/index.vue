<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Users') }}</h1>
    </page-header>
    <div>
      <Tabs v-model="activeTab" class="flex flex-col gap-4">
        <TabsList class="w-full justify-start overflow-x-auto">
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.key"
            :value="tab.key"
            class="capitalize"
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" class="mt-0">
          <users-tabs-user />
        </TabsContent>
        <TabsContent value="userGroup" class="mt-0">
          <users-tabs-group />
        </TabsContent>
      </Tabs>
    </div>
  </page>
</template>

<script setup>
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const activeTab = ref('users')

const tabs = computed(() => [
  { key: 'users', label: t('Users') },
  { key: 'userGroup', label: t('User Groups') },
])
</script>

<style lang="scss" scoped></style>
