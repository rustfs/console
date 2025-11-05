<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closeOnBackdrop?: boolean
    closeOnEscape?: boolean
    showFooter?: boolean
    class?: HTMLAttributes['class']
    contentClass?: HTMLAttributes['class']
  }>(),
  {
    size: 'md',
    closeOnBackdrop: true,
    closeOnEscape: true,
    showFooter: true,
    class: undefined,
    contentClass: undefined,
    title: undefined,
    description: undefined,
  }
)

const modelValue = defineModel<boolean>({ default: false })

const sizeClassMap: Record<NonNullable<typeof props.size>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

const handleUpdateOpen = (value: boolean) => {
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
  <Dialog :open="modelValue" @update:open="handleUpdateOpen">
    <DialogContent
      :class="cn(sizeClassMap[size], props.class, contentClass)"
      @pointerDownOutside="handlePointerOutside"
      @interactOutside="handlePointerOutside"
      @escapeKeyDown="handleEscape"
    >
      <DialogHeader v-if="title || description || $slots.header" class="text-left">
        <slot name="header">
          <DialogTitle v-if="title">{{ title }}</DialogTitle>
          <DialogDescription v-if="description">{{ description }}</DialogDescription>
        </slot>
      </DialogHeader>

      <div class="max-h-[80vh] overflow-scroll">
        <slot />
      </div>

      <DialogFooter v-if="showFooter && $slots.footer" class="border-t pt-4">
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
