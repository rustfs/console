"use client"

import { useEffect, useRef, useState } from "react"
import { initI18n } from "@/lib/i18n"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    initI18n()
      .then(() => {
        if (mountedRef.current) setReady(true)
      })
      .catch(() => {
        if (mountedRef.current) setReady(true)
      })
    return () => {
      mountedRef.current = false
    }
  }, [])

  if (!ready) {
    return <div className="min-h-screen bg-background" />
  }

  return <>{children}</>
}
