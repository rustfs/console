<script setup lang="ts">
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

type DrawerSide = 'left' | 'right' | 'top' | 'bottom'
type DrawerSize = 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    side?: DrawerSide
    size?: DrawerSize
    closeOnBackdrop?: boolean
    closeOnEscape?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    title: undefined,
    description: undefined,
    side: 'right',
    size: 'md',
    closeOnBackdrop: true,
    closeOnEscape: true,
    class: undefined,
  }
)

const sizeClassMap: Record<DrawerSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
}

const modelValue = defineModel<boolean>({ default: false })

const handleUpdate = (value: boolean) => {
  modelValue.value = value
}

const handlePointerOutside = (event: Event) => {
  if (!props.closeOnBackdrop) {
    event.preventDefault()
  }
}

const handleEscape = (event: Event) => {
  if (!props.closeOnEscape) {
    event.preventDefault()
  }
}
</script>

<template>
  <Sheet :open="modelValue" @update:open="handleUpdate">
    <SheetContent
      :side="side"
      :class="cn('flex flex-col gap-4', sizeClassMap[size], props.class)"
      @pointerDownOutside="handlePointerOutside"
      @interactOutside="handlePointerOutside"
      @escapeKeyDown="handleEscape"
    >
      <SheetHeader v-if="title || description || $slots.header" class="text-left">
        <slot name="header">
          <SheetTitle v-if="title">{{ title }}</SheetTitle>
          <SheetDescription v-if="description">
            {{ description }}
          </SheetDescription>
        </slot>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>

      <SheetFooter v-if="$slots.footer">
        <slot name="footer" />
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
