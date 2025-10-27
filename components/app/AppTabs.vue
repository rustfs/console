<script setup lang="ts">
import { Icon } from '#components'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { watch } from 'vue'
import type { HTMLAttributes } from 'vue'

interface TabItem {
  key: string
  label: string
  icon?: string
}

const props = defineProps<{
  tabs: TabItem[]
  modelValue?: string
  class?: HTMLAttributes['class']
}>()

const value = defineModel<string>()

watch(
  () => props.tabs,
  tabs => {
    if (!value.value && tabs?.length) {
      value.value = tabs[0]?.key ?? ''
    }
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <Tabs v-model="value" class="flex flex-col gap-4">
    <TabsList class="w-full justify-start overflow-x-auto">
    <TabsTrigger
      v-for="tab in tabs"
      :key="tab.key"
      :value="tab.key"
      class="capitalize"
    >
        <Icon v-if="tab.icon" :name="tab.icon" class="mr-2 size-4" />
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.key"
      :value="tab.key"
      class="mt-0"
    >
      <slot :name="tab.key" />
    </TabsContent>
  </Tabs>
</template>
