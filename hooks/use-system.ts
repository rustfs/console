"use client"

import { useApi } from "@/contexts/api-context"

export function useSystem() {
  const api = useApi()

  return {
    async getSystemInfo() {
      return api.get("/info")
    },
    async getStorageInfo() {
      return api.get("/storageinfo")
    },
    async getDataUsageInfo() {
      return api.get("/datausageinfo")
    },
    async getSystemMetrics() {
      return api.get("/metrics")
    },
    async getLicense() {
      return api.get("/license")
    },
  }
}
