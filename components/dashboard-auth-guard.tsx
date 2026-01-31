"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useApiReady } from "@/contexts/api-context"

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { isReady } = useApiReady()

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login?unauthorized=true")
    }
  }, [isAuthenticated, isReady, router])

  if (!isReady) {
    return null
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
