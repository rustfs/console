<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

type InputSize = 'sm' | 'md' | 'lg'

const sizeClass: Record<InputSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-3',
  lg: 'h-11 px-4 text-base',
}

const props = withDefaults(
  defineProps<{
    type?: HTMLInputElement['type']
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    size?: InputSize
    class?: HTMLAttributes['class']
    autocomplete?: string
  }>(),
  {
    type: 'text',
    placeholder: '',
    disabled: false,
    readonly: false,
    size: 'md',
    class: undefined,
    autocomplete: undefined,
  }
)

const modelValue = defineModel<string | number | null>({ default: '' })

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  modelValue.value = target.value
}
</script>

<template>
  <Input
    :type="type"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :autocomplete="autocomplete"
    :class="cn(sizeClass[size], props.class)"
    @input="handleInput"
  />
</template>
