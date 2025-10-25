<template>
  <Teleport to="body">
    <div>
      <AlertDialog
        v-for="dialog in dialogs"
        :key="dialog.id"
        :open="dialog.open"
        @update:open="value => controller.setOpen(dialog.id, value)"
      >
        <AlertDialogContent class="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle v-if="dialog.title">{{ dialog.title }}</AlertDialogTitle>
            <AlertDialogDescription v-if="dialog.content">
              {{ dialog.content }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel v-if="dialog.negativeText" @click.prevent="() => handleNegative(dialog)">
              {{ dialog.negativeText }}
            </AlertDialogCancel>
            <AlertDialogAction :class="positiveButtonClass(dialog)" @click.prevent="() => handlePositive(dialog)">
              {{ dialog.positiveText || 'Confirm' }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import type { DialogInstance } from '@/lib/ui/dialog'
import { useDialogController } from '@/lib/ui/dialog'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const controller = useDialogController()
const dialogs = computed(() => controller.dialogs.value)

const positiveButtonClass = (dialog: DialogInstance) => {
  return cn(
    buttonVariants({ variant: dialog.tone === 'destructive' || dialog.tone === 'warning' ? 'destructive' : 'default' }),
    'w-full sm:w-auto'
  )
}

const handleAction = async (
  dialog: DialogInstance,
  action?: DialogInstance['onPositiveClick'] | DialogInstance['onNegativeClick']
) => {
  if (!action) {
    controller.close(dialog.id)
    return
  }

  try {
    const result = await action()
    if (result === false) return

    controller.close(dialog.id)
  } catch (error) {
    console.error(error)
  }
}

const handlePositive = (dialog: DialogInstance) => handleAction(dialog, dialog.onPositiveClick)
const handleNegative = (dialog: DialogInstance) => handleAction(dialog, dialog.onNegativeClick)
</script>
