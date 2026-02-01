"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useGroups() {
  const api = useApi()

  const listGroup = useCallback(async () => api.get("/groups"), [api])

  const getGroup = useCallback(
    async (name: string) => api.get(`/group?group=${encodeURIComponent(name)}`),
    [api]
  )

  const createGroup = useCallback(
    async (data: Record<string, unknown>) => api.post("/groups", data),
    [api]
  )

  const removeGroup = useCallback(
    async (name: string) => api.delete(`/group/${encodeURIComponent(name)}`),
    [api]
  )

  const updateGroup = useCallback(
    async (name: string, data: Record<string, unknown>) =>
      api.put(`/group/${encodeURIComponent(name)}`, data),
    [api]
  )

  const updateGroupStatus = useCallback(
    async (name: string, data: { status: string }) =>
      api.put(`/set-group-status?group=${encodeURIComponent(name)}&status=${data.status}`, data),
    [api]
  )

  const updateGroupMembers = useCallback(
    async (data: {
      group: string
      members: string[]
      isRemove: boolean
      groupStatus?: string
    }) => api.put("/update-group-members", data),
    [api]
  )

  return {
    listGroup,
    getGroup,
    createGroup,
    removeGroup,
    updateGroup,
    updateGroupStatus,
    updateGroupMembers,
  }
}
