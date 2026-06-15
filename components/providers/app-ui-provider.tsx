"use client"

import { Toaster } from "@/components/ui/sonner"
import { MessageProvider } from "@/lib/feedback/message"
import { DialogProvider } from "@/lib/feedback/dialog"
import { DialogHost } from "@/components/dialog-host"
import { SkipLink } from "@/components/skip-link"

export function AppUiProvider({ children }: { children: React.ReactNode }) {
  return (
    <MessageProvider>
      <DialogProvider>
        <SkipLink />
        {children}
        <DialogHost />
        <Toaster position="top-center" richColors closeButton />
      </DialogProvider>
    </MessageProvider>
  )
}
