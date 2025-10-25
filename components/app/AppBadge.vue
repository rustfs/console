<script setup lang="ts">
import type { BadgeVariants } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

type AppBadgeVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'danger'

const variantMap: Record<AppBadgeVariant, BadgeVariants['variant']> = {
  default: 'secondary',
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  danger: 'destructive',
}

const props = withDefaults(
  defineProps<{
    variant?: AppBadgeVariant
    class?: HTMLAttributes['class']
  }>(),
  {
    variant: 'default',
    class: undefined,
  }
)
</script>

<template>
  <Badge :variant="variantMap[variant]" :class="cn('uppercase tracking-wide', props.class)">
    <slot />
  </Badge>
</template>
