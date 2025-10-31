<script setup lang="ts">
import { Icon } from '#components'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'
import { computed, useAttrs } from 'vue'

const modelValue = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    placeholder?: string
    icon?: string
    groupClass?: HTMLAttributes['class']
    inputClass?: HTMLAttributes['class']
    addonClass?: HTMLAttributes['class']
    clearable?: boolean
  }>(),
  {
    placeholder: '',
    icon: 'ri:search-line',
    groupClass: undefined,
    inputClass: undefined,
    addonClass: undefined,
    clearable: false,
  }
)

const attrs = useAttrs()

const showClear = computed(() => props.clearable && Boolean(modelValue.value))

const handleClear = () => {
  modelValue.value = ''
}
</script>

<template>
  <InputGroup v-bind="attrs" :class="cn('w-full', groupClass)">
    <InputGroupAddon :class="cn('text-muted-foreground', addonClass)">
      <Icon :name="icon" class="size-4" />
    </InputGroupAddon>
    <InputGroupInput v-model="modelValue" :placeholder="placeholder" :class="inputClass" />
    <InputGroupButton v-if="showClear" variant="ghost" size="icon-xs" aria-label="Clear" @click="handleClear">
      <Icon name="ri:close-line" class="size-4" />
    </InputGroupButton>
    <slot />
  </InputGroup>
</template>
