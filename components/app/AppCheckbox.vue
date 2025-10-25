<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    description?: string
    disabled?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    label: undefined,
    description: undefined,
    disabled: false,
    class: undefined,
  }
)

const modelValue = defineModel<boolean>({ default: false })

const handleCheckedChange = (value: boolean | 'indeterminate') => {
  modelValue.value = value === true
}
</script>

<template>
  <label :class="cn('flex items-start gap-3', props.class)">
    <Checkbox
      :checked="modelValue"
      :disabled="disabled"
      class="mt-1"
      @update:checked="handleCheckedChange"
    />
    <span class="flex flex-col gap-1">
      <span v-if="label" class="text-sm font-medium leading-tight">{{ label }}</span>
      <span v-else class="text-sm font-medium leading-tight">
        <slot />
      </span>
      <span v-if="description" class="text-xs text-muted-foreground">{{ description }}</span>
    </span>
  </label>
</template>
