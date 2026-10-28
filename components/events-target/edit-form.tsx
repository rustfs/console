"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/dialog"
import { EventsTargetNewForm } from "@/components/events-target/new-form"
import { useEventTarget } from "@/hooks/use-event-target"
import { EventTargetRevisionUnavailableError, parseEditableEventTarget } from "@/lib/event-target-api"
import { EVENT_TARGET_TYPE_OPTIONS, type EventTargetType } from "@/lib/events-target-config"

type Target = { service: string; account_id: string }
type Edit = { type: EventTargetType; name: string; config: Record<string, string>; revision: string }

export function EventsTargetEditForm({
  target,
  onClose,
  onSuccess,
}: {
  target: Target
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const { getEventTargetInstance } = useEventTarget()
  const [edit, setEdit] = React.useState<Edit>()
  const [error, setError] = React.useState("")
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    let active = true
    setError("")
    getEventTargetInstance(target.service, target.account_id)
      .then((instance) => {
        const type = EVENT_TARGET_TYPE_OPTIONS.find((option) => option.value.toLowerCase() === target.service)?.value
        if (!type) throw new Error("Unsupported destination type")
        const { config, revision } = parseEditableEventTarget(instance, target.service, target.account_id)
        if (active) setEdit({ type, name: target.account_id, config, revision })
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof EventTargetRevisionUnavailableError
              ? t("Upgrade RustFS to edit event destinations safely.")
              : reason instanceof Error
                ? reason.message
                : t("Load Failed"),
          )
      })
    return () => {
      active = false
    }
  }, [getEventTargetInstance, target, attempt, t])

  if (edit)
    return (
      <EventsTargetNewForm
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        onSuccess={onSuccess}
        edit={edit}
      />
    )

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("Edit Configuration")}: {target.account_id}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {error ? (
            <p role="alert">
              {t("Load Failed")}: {error}
            </p>
          ) : (
            <p>{t("Loading…")}</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          {error && <Button onClick={() => setAttempt((value) => value + 1)}>{t("Retry")}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
