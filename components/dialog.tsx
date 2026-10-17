"use client"

import * as React from "react"
import * as DialogPrimitive from "@/components/ui/dialog"
import * as AlertDialogPrimitive from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

export { Dialog, DialogClose, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Shared by storage, identity, and administration forms; primitives stay upstream-compatible.
export function DialogContent({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.DialogContent>) {
  return (
    <DialogPrimitive.DialogContent
      className={cn(
        "console-dialog max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg",
        className,
      )}
      {...props}
    />
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.DialogHeader>) {
  return (
    <DialogPrimitive.DialogHeader
      className={cn("gap-2 border-b px-5 py-5 pe-14 sm:px-6 sm:pe-14", className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.DialogTitle>) {
  return <DialogPrimitive.DialogTitle className={cn("text-xl font-semibold leading-tight", className)} {...props} />
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("dialog-body min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6", className)} {...props} />
  )
}

export function DialogFooter({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.DialogFooter>) {
  return <DialogPrimitive.DialogFooter className={cn("border-t bg-muted/20 px-5 py-4 sm:px-6", className)} {...props} />
}

export function DialogSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section
      aria-labelledby={id}
      className="dialog-section grid min-w-0 gap-4 border-t pt-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6"
    >
      <h3 id={id} className="text-sm font-medium">
        {title}
      </h3>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  )
}

export function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialogContent>) {
  return (
    <AlertDialogPrimitive.AlertDialogContent className={cn("console-confirmation gap-6 p-6", className)} {...props} />
  )
}

export function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.AlertDialogFooter>) {
  return <AlertDialogPrimitive.AlertDialogFooter className={cn("border-t pt-5", className)} {...props} />
}
