<script setup lang="ts">
import type { ButtonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner/Spinner.vue'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

type AppButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger'
type AppButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const variantMap: Record<AppButtonVariant, ButtonVariants['variant']> = {
  default: 'secondary',
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
  link: 'link',
  danger: 'destructive',
}

const sizeMap: Record<AppButtonSize, ButtonVariants['size']> = {
  xs: 'sm',
  sm: 'sm',
  md: 'default',
  lg: 'lg',
  xl: 'lg',
}

const props = withDefaults(
  defineProps<{
    variant?: AppButtonVariant
    size?: AppButtonSize
    loading?: boolean
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    class?: HTMLAttributes['class']
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    block: false,
    disabled: false,
    type: 'button',
    class: undefined,
  }
)

const emits = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const handleClick = (event: MouseEvent) => {
  if (props.loading || props.disabled) {
    event.preventDefault()
    return
  }
  emits('click', event)
}
</script>

<template>
  <Button
    :type="type"
    :variant="variantMap[variant]"
    :size="sizeMap[size]"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    :class="cn('gap-2', block && 'w-full', loading && 'cursor-wait', props.class)"
    @click="handleClick"
  >
    <Spinner v-if="loading" class="size-4" />
    <slot />
  </Button>
</template>
