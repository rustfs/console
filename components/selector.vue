<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'

type OptionValue = string | number | boolean

export interface SelectOption {
  label: string
  value: OptionValue
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    emptyMessage?: string
    class?: HTMLAttributes['class']
    contentClass?: HTMLAttributes['class']
  }>(),
  {
    placeholder: 'Select...',
    disabled: false,
    emptyMessage: undefined,
    class: undefined,
    contentClass: undefined,
  }
)

const modelValue = defineModel<OptionValue | null>({
  default: null,
})

const optionMap = computed(() => {
  const map = new Map<string, OptionValue>()
  for (const option of props.options) {
    map.set(String(option.value), option.value)
  }
  return map
})

const internalValue = computed<string | undefined>({
  get: () => {
    const value = modelValue.value
    if (value === null || value === undefined) {
      return undefined
    }

    const map = optionMap.value

    for (const [key, original] of map.entries()) {
      if (original === value) {
        return key
      }
    }

    return String(value)
  },
  set: value => {
    if (value === undefined || value === '') {
      modelValue.value = null
      return
    }

    const map = optionMap.value
    modelValue.value = map.get(value) ?? value
  },
})
</script>

<template>
  <Select v-model="internalValue" :disabled="disabled">
    <SelectTrigger :class="cn('w-full', props.class)">
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent :class="contentClass">
      <template v-if="options.length">
        <SelectItem
          v-for="option in options"
          :key="String(option.value)"
          :value="String(option.value)"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </SelectItem>
      </template>
      <div v-else class="px-2 py-3 text-sm text-muted-foreground">
        {{ emptyMessage || 'No options available' }}
      </div>
    </SelectContent>
  </Select>
</template>
