<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { ProgressIndicator, ProgressRoot, type ProgressRootProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<
    {
      value?: number
      processing?: boolean
      height?: number | string
      class?: HTMLAttributes['class']
    } & ProgressRootProps
  >(),
  {
    value: 0,
    processing: false,
  }
)

const delegatedProps = reactiveOmit(props, 'value', 'processing', 'height', 'class')

const normalizedValue = computed(() => {
  if (props.value === undefined || Number.isNaN(props.value)) return 0
  return Math.min(100, Math.max(0, props.value))
})

const heightStyle = computed(() => {
  if (!props.height) return undefined
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height
})
</script>

<template>
  <ProgressRoot
    v-bind="delegatedProps"
    :model-value="normalizedValue"
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', props.class)"
    :style="heightStyle ? { height: heightStyle } : undefined"
  >
    <ProgressIndicator
      :class="cn(
        'h-full w-full flex-1 bg-primary transition-all',
        props.processing && 'animate-[progress-indeterminate_1.2s_ease_infinite]'
      )"
      :style="`transform: translateX(-${100 - normalizedValue}%);`"
    />
  </ProgressRoot>
</template>

<style scoped>
@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(-50%);
  }
  100% {
    transform: translateX(0%);
  }
}
</style>
