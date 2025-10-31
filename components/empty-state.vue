<script setup lang="ts">
import { Icon } from '#components'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    icon?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    title: undefined,
    description: undefined,
    icon: undefined,
    class: undefined,
  }
)
</script>

<template>
  <Empty :class="cn('py-10', props.class)">
    <EmptyContent class="max-w-sm text-center">
      <EmptyHeader>
        <EmptyMedia v-if="props.icon" class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon :name="props.icon" class="h-6 w-6 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle v-if="title">{{ title }}</EmptyTitle>
        <EmptyDescription v-if="description">
          {{ description }}
        </EmptyDescription>
      </EmptyHeader>
      <slot />
    </EmptyContent>
  </Empty>
</template>
