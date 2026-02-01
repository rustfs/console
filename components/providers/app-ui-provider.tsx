"use client"

import { Toaster } from "@/components/ui/sonner"
import { MessageProvider } from "@/lib/feedback/message"
import { DialogProvider } from "@/lib/feedback/dialog"
import { DialogHost } from "@/components/dialog-host"

export function AppUiProvider({ children }: { children: React.ReactNode }) {
  return (
    <MessageProvider>
      <DialogProvider>
        {children}
        <DialogHost />
        <Toaster position="top-center" richColors closeButton />
      </DialogProvider>
    </MessageProvider>
  )
}
