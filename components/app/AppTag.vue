<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

type TagTone = 'default' | 'info' | 'success' | 'warning' | 'danger'

const toneClass: Record<TagTone, string> = {
  default: 'bg-muted text-muted-foreground',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200',
}

const props = withDefaults(
  defineProps<{
    tone?: TagTone
    class?: HTMLAttributes['class']
  }>(),
  {
    tone: 'default',
    class: undefined,
  }
)
</script>

<template>
  <Badge variant="outline" :class="cn('lowercase border-none', toneClass[tone], props.class)">
    <slot />
  </Badge>
</template>
