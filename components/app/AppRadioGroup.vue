<script setup lang="ts">
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'

type OptionValue = string | number

export interface RadioOption {
  label: string
  value: OptionValue
  description?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    options: RadioOption[]
    class?: HTMLAttributes['class']
    itemClass?: HTMLAttributes['class']
  }>(),
  {
    class: undefined,
    itemClass: undefined,
  }
)

const modelValue = defineModel<OptionValue | null>({
  default: null,
})

const internalValue = computed<string | undefined>({
  get: () => {
    const value = modelValue.value
    if (value === null || value === undefined) {
      return undefined
    }
    return String(value)
  },
  set: value => {
    if (value === undefined) {
      modelValue.value = null
      return
    }
    const option = props.options.find(option => String(option.value) === value)
    modelValue.value = option ? option.value : (value as OptionValue)
  },
})
</script>

<template>
  <RadioGroup v-model="internalValue" :class="props.class">
    <label
      v-for="option in options"
      :key="String(option.value)"
      :class="cn('flex items-start gap-3 rounded-md border border-border/50 p-3', itemClass, option.disabled && 'opacity-60')"
    >
      <RadioGroupItem :value="String(option.value)" :disabled="option.disabled" class="mt-0.5" />
      <span class="flex flex-col gap-1">
        <span class="text-sm font-medium">{{ option.label }}</span>
        <span v-if="option.description" class="text-xs text-muted-foreground">
          {{ option.description }}
        </span>
      </span>
    </label>
  </RadioGroup>
</template>
