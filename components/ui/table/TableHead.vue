<script setup lang="ts">
import type { HTMLAttributes, CSSProperties } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  style?: CSSProperties | string
}>()
</script>

<template>
  <th
    :class="
      cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        props.class
      )
    "
    :style="props.style"
  >
    <slot />
  </th>
</template>
