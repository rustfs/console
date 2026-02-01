"use client"

import { Toaster } from "@/components/ui/sonner"
import { MessageProvider } from "@/lib/ui/message"
import { DialogProvider } from "@/lib/ui/dialog"
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
