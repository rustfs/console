<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'
import AppCheckbox from './AppCheckbox.vue'

type OptionValue = string | number | boolean

export interface CheckboxOption {
  label: string
  value: OptionValue
  description?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    options: CheckboxOption[]
    direction?: 'vertical' | 'horizontal'
    class?: HTMLAttributes['class']
  }>(),
  {
    direction: 'vertical',
    class: undefined,
  }
)

const modelValue = defineModel<OptionValue[]>({
  default: [],
})

const isChecked = (value: OptionValue) => modelValue.value.includes(value)

const handleChange = (value: OptionValue, checked: boolean) => {
  const next = new Set(modelValue.value)
  if (checked) {
    next.add(value)
  } else {
    next.delete(value)
  }
  modelValue.value = Array.from(next)
}
</script>

<template>
  <div
    :class="cn(
      'gap-3',
      direction === 'horizontal' ? 'flex flex-wrap items-center' : 'flex flex-col',
      props.class
    )"
  >
    <AppCheckbox
      v-for="option in options"
      :key="String(option.value)"
      :label="option.label"
      :description="option.description"
      :disabled="option.disabled"
      :class="direction === 'horizontal' ? 'flex-row items-center' : ''"
      :model-value="isChecked(option.value)"
      @update:model-value="value => handleChange(option.value, value)"
    />
  </div>
</template>
