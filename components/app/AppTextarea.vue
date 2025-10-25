<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    rows?: number
    disabled?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    placeholder: '',
    rows: 4,
    disabled: false,
    class: undefined,
  }
)

const modelValue = defineModel<string | number | undefined>({ default: '' })
</script>

<template>
  <Textarea
    v-model="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    :class="cn('resize-y', props.class)"
  />
</template>
