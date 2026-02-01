"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDialogController } from "@/lib/ui/dialog"
import type { DialogInstance } from "@/lib/ui/dialog"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function positiveButtonVariant(dialog: DialogInstance) {
  return dialog.tone === "destructive" ? "destructive" : dialog.tone === "warning" ? "secondary" : "default"
}

function handleAction(
  controller: ReturnType<typeof useDialogController>,
  dialog: DialogInstance,
  action?: DialogInstance["onPositiveClick"] | DialogInstance["onNegativeClick"]
) {
  if (!action) {
    controller.close(dialog.id)
    return
  }

  const run = async () => {
    try {
      const result = await action()
      if (result === false) return
      controller.close(dialog.id)
    } catch (error) {
      console.error(error)
    }
  }

  run()
}

export function DialogHost() {
  const controller = useDialogController()
  const dialogs = controller.dialogs

  return (
    <>
      {dialogs.map((dialog) => (
        <AlertDialog
          key={dialog.id}
          open={dialog.open}
          onOpenChange={(value) => controller.setOpen(dialog.id, value)}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              {dialog.title && <AlertDialogTitle>{dialog.title}</AlertDialogTitle>}
              {dialog.content && (
                <AlertDialogDescription>{dialog.content}</AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              {dialog.negativeText && (
                <AlertDialogCancel asChild>
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto text-foreground")}
                    onClick={(e) => {
                      e.preventDefault()
                      handleAction(controller, dialog, dialog.onNegativeClick)
                    }}
                  >
                    {dialog.negativeText}
                  </button>
                </AlertDialogCancel>
              )}
              <AlertDialogAction asChild>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: positiveButtonVariant(dialog) }),
                    "w-full sm:w-auto",
                    positiveButtonVariant(dialog) === "destructive" && "text-white"
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    handleAction(controller, dialog, dialog.onPositiveClick)
                  }}
                >
                  {dialog.positiveText || "Confirm"}
                </button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </>
  )
}
