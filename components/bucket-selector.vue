<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'
import { computed, useAttrs } from 'vue'
import Selector, { type SelectOption } from '~/components/selector.vue'

defineOptions({ inheritAttrs: false })

const modelValue = defineModel<SelectOption['value'] | null>({
  default: null,
})

const props = withDefaults(
  defineProps<{
    options: SelectOption[]
    label?: string
    placeholder?: string
    disabled?: boolean
    description?: string
    layout?: 'inline' | 'stacked'
    hideLabel?: boolean
    class?: HTMLAttributes['class']
    selectorClass?: HTMLAttributes['class']
    loading?: boolean
    emptyMessage?: string
  }>(),
  {
    label: 'Bucket',
    placeholder: 'Please select bucket',
    disabled: false,
    description: undefined,
    layout: 'inline',
    hideLabel: false,
    class: undefined,
    selectorClass: undefined,
    loading: false,
    emptyMessage: undefined,
  }
)

const attrs = useAttrs()

const containerClasses = computed(() =>
  props.layout === 'inline' ? 'flex items-center gap-3' : 'flex flex-col gap-2'
)

const controlWrapperClasses = computed(() =>
  props.layout === 'inline' ? 'flex flex-col gap-1 min-w-[220px]' : 'flex flex-col gap-1'
)
</script>

<template>
  <div v-bind="attrs" :class="cn(containerClasses, props.class)">
    <Label v-if="!props.hideLabel" class="text-sm font-medium text-muted-foreground">
      {{ props.label }}
    </Label>
    <div :class="controlWrapperClasses">
      <Selector v-model="modelValue" :options="props.options" :placeholder="props.placeholder" :disabled="props.disabled || props.loading" :empty-message="props.emptyMessage"
        :class="cn('min-w-[200px]', props.selectorClass)" />
      <p v-if="props.description" class="text-xs text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
    <Spinner v-if="props.loading && props.layout === 'inline'" class="size-4 text-muted-foreground" />
  </div>
</template>
