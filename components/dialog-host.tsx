"use client"

import * as React from "react"
import { RiLoaderLine } from "@remixicon/react"
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
import { runDialogAction } from "@/lib/feedback/dialog-action"
import { useDialogController } from "@/lib/feedback/dialog"
import type { DialogInstance } from "@/lib/feedback/dialog"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function positiveButtonVariant(dialog: DialogInstance) {
  return dialog.tone === "destructive" ? "destructive" : dialog.tone === "warning" ? "secondary" : "default"
}

export function DialogHost() {
  const controller = useDialogController()
  const dialogs = controller.dialogs
  const pendingDialogIdsRef = React.useRef(new Set<string>())
  const [pendingDialogIds, setPendingDialogIds] = React.useState<Set<string>>(new Set())

  return (
    <>
      {dialogs.map((dialog) => {
        const isPending = pendingDialogIds.has(dialog.id)

        return (
          <AlertDialog
            key={dialog.id}
            open={dialog.open}
            onOpenChange={(value) => controller.setOpen(dialog.id, value)}
          >
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                {dialog.title && <AlertDialogTitle>{dialog.title}</AlertDialogTitle>}
                {dialog.content && <AlertDialogDescription>{dialog.content}</AlertDialogDescription>}
              </AlertDialogHeader>
              <AlertDialogFooter>
                {dialog.negativeText && (
                  <AlertDialogCancel asChild>
                    <button
                      type="button"
                      disabled={isPending}
                      className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto text-foreground")}
                      onClick={(e) => {
                        e.preventDefault()
                        void runDialogAction({
                          dialogId: dialog.id,
                          pendingIds: pendingDialogIdsRef.current,
                          setPendingIds: setPendingDialogIds,
                          action: dialog.onNegativeClick,
                          close: () => controller.close(dialog.id),
                          onError: (error) => {
                            console.error(error)
                          },
                        })
                      }}
                    >
                      {dialog.negativeText}
                    </button>
                  </AlertDialogCancel>
                )}
                <AlertDialogAction asChild>
                  <button
                    type="button"
                    disabled={isPending}
                    className={cn(
                      buttonVariants({ variant: positiveButtonVariant(dialog) }),
                      "w-full sm:w-auto",
                      positiveButtonVariant(dialog) === "destructive" && "text-white",
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      void runDialogAction({
                        dialogId: dialog.id,
                        pendingIds: pendingDialogIdsRef.current,
                        setPendingIds: setPendingDialogIds,
                        action: dialog.onPositiveClick,
                        close: () => controller.close(dialog.id),
                        onError: (error) => {
                          console.error(error)
                        },
                      })
                    }}
                  >
                    {isPending ? <RiLoaderLine className="size-4 animate-spin" aria-hidden="true" /> : null}
                    <span>{dialog.positiveText || "Confirm"}</span>
                  </button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })}
    </>
  )
}
