"use client"

import { useApi } from "@/contexts/api-context"

export function useGroups() {
  const api = useApi()

  const listGroup = async () => api.get("/groups")

  const getGroup = async (name: string) =>
    api.get(`/group?group=${encodeURIComponent(name)}`)

  const createGroup = async (data: Record<string, unknown>) =>
    api.post("/groups", data)

  const removeGroup = async (name: string) =>
    api.delete(`/group/${encodeURIComponent(name)}`)

  const updateGroup = async (name: string, data: Record<string, unknown>) =>
    api.put(`/group/${encodeURIComponent(name)}`, data)

  const updateGroupStatus = async (name: string, data: { status: string }) =>
    api.put(`/set-group-status?group=${encodeURIComponent(name)}&status=${data.status}`, data)

  const updateGroupMembers = async (data: {
    group: string
    members: string[]
    isRemove: boolean
    groupStatus?: string
  }) => api.put("/update-group-members", data)

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
