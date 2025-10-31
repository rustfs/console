<script setup lang="ts">
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    placeholder?: string
    min?: string
    max?: string
    disabled?: boolean
    class?: HTMLAttributes['class']
    name?: string
    id?: string
    required?: boolean
  }>(),
  {
    modelValue: null,
    placeholder: '',
    min: undefined,
    max: undefined,
    disabled: false,
    class: undefined,
    name: undefined,
    id: undefined,
    required: false,
  }
)

const modelValue = defineModel<string | null>({ default: null })

const inputValue = computed({
  get: () => {
    const value = modelValue.value ?? props.modelValue
    if (!value) return ''
    const date = dayjs(value)
    if (!date.isValid()) return ''
    return date.format('YYYY-MM-DDTHH:mm')
  },
  set: value => {
    if (!value) {
      modelValue.value = null
      return
    }
    const date = dayjs(value)
    modelValue.value = date.isValid() ? date.toISOString() : null
  },
})

const minValue = computed(() => {
    if (!props.min) return undefined
    const date = dayjs(props.min)
    return date.isValid() ? date.format('YYYY-MM-DDTHH:mm') : undefined
})

const maxValue = computed(() => {
    if (!props.max) return undefined
    const date = dayjs(props.max)
    return date.isValid() ? date.format('YYYY-MM-DDTHH:mm') : undefined
})
</script>

<template>
  <input
    v-model="inputValue"
    type="datetime-local"
    :id="id"
    :name="name"
    :placeholder="placeholder"
    :min="minValue"
    :max="maxValue"
    :disabled="disabled"
    :required="required"
    :class="cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  />
</template>
