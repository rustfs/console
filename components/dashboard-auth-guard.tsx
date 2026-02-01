"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useApiReady } from "@/contexts/api-context"
import { useS3Ready } from "@/contexts/s3-context"

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { isReady: apiReady } = useApiReady()
  const { isReady: s3Ready } = useS3Ready()

  const isReady = apiReady && s3Ready

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
