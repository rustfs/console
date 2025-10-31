<script setup lang="ts">
import { Icon } from '#components'
import { ref } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    accept?: string
    disabled?: boolean
    class?: HTMLAttributes['class']
    icon?: string
  }>(),
  {
    accept: undefined,
    disabled: false,
    class: undefined,
    icon: 'ri:upload-cloud-2-line',
  }
)

const emit = defineEmits<{
  (e: 'change', file: File | null): void
}>()

const hovering = ref(false)

const handleFiles = (files?: FileList | null) => {
  if (!files || files.length === 0) {
    emit('change', null)
    return
  }
  emit('change', files[0] ?? null)
}

const onInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  handleFiles(target.files)
  target.value = ''
}

const onDrop = (event: DragEvent) => {
  if (props.disabled) return
  event.preventDefault()
  hovering.value = false
  handleFiles(event.dataTransfer?.files)
}

const onDragOver = (event: DragEvent) => {
  if (props.disabled) return
  event.preventDefault()
  hovering.value = true
}

const onDragLeave = () => {
  hovering.value = false
}
</script>

<template>
  <label
    :class="
      cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-6 py-10 text-center transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        hovering && !disabled && 'border-primary bg-primary/5',
        disabled && 'pointer-events-none opacity-60',
        props.class
      )
    "
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <input type="file" :accept="accept" class="hidden" :disabled="disabled" @change="onInputChange" />
    <Icon :name="icon" class="h-12 w-12 text-muted-foreground" />
    <slot />
  </label>
</template>
