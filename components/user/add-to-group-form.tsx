"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiRefreshLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useGroups } from "@/hooks/use-groups"
import { useMessage } from "@/lib/feedback/message"
import { buildAddUsersToGroupsRequests } from "@/lib/user-group-memberships"
import { UserEditGroups } from "./edit/groups"

interface UserAddToGroupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUsers: string[]
  onSuccess: () => void
}

export function UserAddToGroupForm({ open, onOpenChange, selectedUsers, onSuccess }: UserAddToGroupFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { listGroup, updateGroupMembers } = useGroups()
  const [groups, setGroups] = React.useState<string[]>([])
  const [groupsList, setGroupsList] = React.useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const [submitError, setSubmitError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    setGroups([])
    setGroupsList([])
    setLoadError("")
    setSubmitError("")
    setLoading(true)
    listGroup()
      .then((res) => {
        if (cancelled) return
        setGroupsList(
          ((res as string[] | undefined) ?? [])
            .slice()
            .sort((a, b) => a.localeCompare(b))
            .map((group) => ({ label: group, value: group })),
        )
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError((error as Error)?.message || t("Failed to get data"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [listGroup, loadVersion, open, t])

  const closeModal = () => onOpenChange(false)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!submitting || nextOpen) onOpenChange(nextOpen)
  }

  const submitForm = async () => {
    if (loading || loadError || submitting) return
    const requests = buildAddUsersToGroupsRequests(selectedUsers, groups)
    if (!requests.length) {
      message.error(t("Please select at least one item"))
      return
    }

    setSubmitting(true)
    setSubmitError("")
    try {
      const results = await Promise.allSettled(requests.map((request) => updateGroupMembers(request)))
      const failedGroups = results.flatMap((result, index) =>
        result.status === "rejected" ? [requests[index].group] : [],
      )
      const succeeded = results.length - failedGroups.length

      if (succeeded > 0) onSuccess()
      if (failedGroups.length) {
        const firstFailure = results.find((result) => result.status === "rejected")
        const reason = firstFailure?.status === "rejected" ? (firstFailure.reason as Error)?.message : ""
        const errorMessage = reason || t("Edit Failed")
        setGroups(failedGroups)
        setSubmitError(errorMessage)
        message.error(errorMessage)
        return
      }

      message.success(t("Edit Success"))
      onOpenChange(false)
    } catch (error) {
      const errorMessage = (error as Error)?.message || t("Edit Failed")
      setSubmitError(errorMessage)
      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,44rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{t("Add to Group")}</DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void submitForm()
          }}
        >
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{t("Users")}</div>
                <span className="text-xs tabular-nums text-muted-foreground">{selectedUsers.length}</span>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                {selectedUsers.slice(0, 5).map((user) => (
                  <Badge key={user} variant="secondary" className="h-auto max-w-full justify-start whitespace-normal">
                    <span className="min-w-0 break-all" title={user}>
                      {user}
                    </span>
                  </Badge>
                ))}
                {selectedUsers.length > 5 ? <Badge variant="outline">+{selectedUsers.length - 5}</Badge> : null}
              </div>
            </div>

            <UserEditGroups value={groups} options={groupsList} disabled={loading || submitting} onChange={setGroups} />

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Spinner className="size-4" aria-hidden />
                {t("Loading…")}
              </div>
            ) : loadError ? (
              <div className="flex items-center justify-between gap-3 border border-dashed p-3" role="alert">
                <p className="min-w-0 break-words text-sm text-destructive">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setLoadVersion((current) => current + 1)}
                >
                  <RiRefreshLine className="size-4" aria-hidden />
                  {t("Refresh")}
                </Button>
              </div>
            ) : null}

            {submitError ? (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={closeModal}
              disabled={submitting}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={loading || Boolean(loadError) || submitting || !selectedUsers.length || !groups.length}
            >
              {submitting ? <Spinner className="size-4" /> : null}
              <span>{t("Save")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
