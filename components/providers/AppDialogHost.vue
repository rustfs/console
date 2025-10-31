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
            <AlertDialogCancel v-if="dialog.negativeText" as-child @click.prevent="() => handleNegative(dialog)">
              <Button :variant="negativeButtonVariant(dialog)" class="w-full sm:w-auto text-foreground">
                {{ dialog.negativeText }}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child @click.prevent="() => handlePositive(dialog)">
              <Button :class="positiveButtonClass(dialog)">
                {{ dialog.positiveText || 'Confirm' }}
              </Button>
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
import { Button } from '@/components/ui/button'
import type { ButtonVariants } from '@/components/ui/button'
import type { DialogInstance } from '@/lib/ui/dialog'
import { useDialogController } from '@/lib/ui/dialog'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const controller = useDialogController()
const dialogs = computed(() => controller.dialogs.value)

const negativeButtonVariant = (dialog: DialogInstance): ButtonVariants['variant'] => {
  return 'outline'
}

const positiveButtonClass = (dialog: DialogInstance) => {
  const variant = dialog.tone === 'destructive' ? 'destructive' : dialog.tone === 'warning' ? 'secondary' : 'default'

  return cn(buttonVariants({ variant }), 'w-full sm:w-auto', variant === 'destructive' && 'text-white')
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
