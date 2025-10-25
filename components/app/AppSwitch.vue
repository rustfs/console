<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    class: undefined,
  }
)

const modelValue = defineModel<boolean>({ default: false })

const handleCheckedChange = (value: boolean) => {
  modelValue.value = value
}
</script>

<template>
  <Switch
    :checked="modelValue"
    :disabled="disabled"
    :class="props.class"
    @update:checked="handleCheckedChange"
  />
</template>
