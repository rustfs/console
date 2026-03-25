"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirstAccessibleDashboardRoute } from "@/hooks/use-first-accessible-dashboard-route"

export default function HomePage() {
  const router = useRouter()
  const { route, isReady } = useFirstAccessibleDashboardRoute()

  useEffect(() => {
    if (!isReady || !route) return
    router.replace(route)
  }, [isReady, route, router])

  return null
}
