"use client"

import { useEffect, useState } from "react"
import { initI18n } from "@/lib/i18n"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initI18n().then(() => setReady(true))
  }, [])

  if (!ready) {
    return <div className="min-h-screen bg-background" />
  }

  return <>{children}</>
}
