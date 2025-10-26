<script setup lang="ts">
import { Loader2Icon } from 'lucide-vue-next'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg' | 'xl'
    class?: HTMLAttributes['class']
  }>(),
  {
    size: 'md',
  }
)

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-3'
    case 'lg':
      return 'size-6'
    case 'xl':
      return 'size-8'
    default:
      return 'size-4'
  }
})
</script>

<template>
  <Loader2Icon
    role="status"
    aria-label="Loading"
    :class="cn('animate-spin text-muted-foreground', sizeClass, props.class)"
  />
</template>
