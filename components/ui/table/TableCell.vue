<script setup lang="ts">
import type { HTMLAttributes, CSSProperties } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  style?: CSSProperties | string
}>()
</script>

<template>
  <td :class="cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', props.class)" :style="props.style">
    <slot />
  </td>
</template>
