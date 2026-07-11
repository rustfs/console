"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiArrowDownSLine, RiCheckLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useMessage } from "@/lib/feedback/message"
import { useUsers } from "@/hooks/use-users"
import { usePolicies } from "@/hooks/use-policies"
import { useGroups } from "@/hooks/use-groups"
import { cn } from "@/lib/utils"

interface UserNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 128
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 40

export function UserNewForm({ open, onOpenChange, onSuccess }: UserNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { createUser } = useUsers()
  const { listPolicies, setUserOrGroupPolicy } = usePolicies()
  const { listGroup, updateGroupMembers } = useGroups()

  const [accessKey, setAccessKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [groups, setGroups] = React.useState<string[]>([])
  const [policies, setPolicies] = React.useState<string[]>([])
  const [groupsList, setGroupsList] = React.useState<{ label: string; value: string }[]>([])
  const [policiesList, setPoliciesList] = React.useState<{ label: string; value: string }[]>([])
  const [groupOpen, setGroupOpen] = React.useState(false)
  const [policyOpen, setPolicyOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const [errors, setErrors] = React.useState({ accessKey: "", secretKey: "" })

  React.useEffect(() => {
    if (!open) return

    setAccessKey("")
    setSecretKey("")
    setGroups([])
    setPolicies([])
    setGroupsList([])
    setPoliciesList([])
    setGroupOpen(false)
    setPolicyOpen(false)
    setErrors({ accessKey: "", secretKey: "" })
  }, [open])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    setGroupsList([])
    setPoliciesList([])
    setLoadError("")
    setLoading(true)

    Promise.all([listGroup(), listPolicies()])
      .then(([groupResult, policyResult]) => {
        if (cancelled) return
        setGroupsList(((groupResult as string[] | undefined) ?? []).map((g) => ({ label: g, value: g })))
        setPoliciesList(
          Object.keys((policyResult as Record<string, unknown> | undefined) ?? {}).map((p) => ({ label: p, value: p })),
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
  }, [listGroup, listPolicies, loadVersion, open, t])

  const toggleGroup = (value: string) => {
    setGroups((prev) => (prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]))
  }

  const togglePolicy = (value: string) => {
    setPolicies((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]))
  }

  const closeModal = () => onOpenChange(false)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!submitting || nextOpen) onOpenChange(nextOpen)
  }

  const validate = () => {
    const newErrors = { accessKey: "", secretKey: "" }
    if (!accessKey.trim()) {
      newErrors.accessKey = t("Please enter username")
    } else if (accessKey.trim().length < USERNAME_MIN_LENGTH || accessKey.trim().length > USERNAME_MAX_LENGTH) {
      newErrors.accessKey = t("username length cannot be less than 3 characters and greater than 128 characters")
    }
    if (!secretKey.trim()) {
      newErrors.secretKey = t("Please enter password")
    } else if (secretKey.length < PASSWORD_MIN_LENGTH || secretKey.length > PASSWORD_MAX_LENGTH) {
      newErrors.secretKey = t("password length cannot be less than 8 characters and greater than 40 characters")
    }
    setErrors(newErrors)
    return !newErrors.accessKey && !newErrors.secretKey
  }

  const submitForm = async () => {
    if (submitting) return
    if (!validate()) {
      message.error(t("Please fill in the correct format"))
      return
    }

    setSubmitting(true)
    try {
      await createUser({
        accessKey: accessKey.trim(),
        secretKey,
        status: "enabled",
      })

      if (policies.length) {
        await setUserOrGroupPolicy({
          policyName: policies,
          userOrGroup: accessKey.trim(),
          isGroup: false,
        })
      }

      if (groups.length) {
        await Promise.all(
          groups.map((group) =>
            updateGroupMembers({
              group,
              members: [accessKey.trim()],
              isRemove: false,
              groupStatus: "enabled",
            }),
          ),
        )
      }

      message.success(t("Add Success"))
      closeModal()
      onSuccess()
    } catch (error) {
      console.error(error)
      message.error(t("Add Failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{t("Create User")}</DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void submitForm()
          }}
        >
          <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="new-user-access-key">{t("User Name")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="new-user-access-key"
                    name="new-user-access-key"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    minLength={USERNAME_MIN_LENGTH}
                    maxLength={USERNAME_MAX_LENGTH}
                    autoComplete="off"
                    spellCheck={false}
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(errors.accessKey)}
                    aria-describedby={errors.accessKey ? "new-user-access-key-error" : undefined}
                  />
                </FieldContent>
                <FieldError id="new-user-access-key-error">{errors.accessKey}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="new-user-password">{t("Password")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="new-user-password"
                    name="new-user-password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    type="password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                    autoComplete="new-password"
                    spellCheck={false}
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(errors.secretKey)}
                    aria-describedby={errors.secretKey ? "new-user-password-error" : undefined}
                  />
                </FieldContent>
                <FieldError id="new-user-password-error">{errors.secretKey}</FieldError>
              </Field>
            </div>

            {loading ? (
              <div
                className="flex items-center gap-2 border border-dashed p-3 text-sm text-muted-foreground"
                role="status"
              >
                <Spinner className="size-4" />
                {t("Loading…")}
              </div>
            ) : loadError ? (
              <div className="flex flex-wrap items-center gap-3 border border-dashed p-3" role="alert">
                <p className="min-w-0 flex-1 text-sm text-destructive">{loadError}</p>
                <Button type="button" variant="outline" onClick={() => setLoadVersion((current) => current + 1)}>
                  <RiRefreshLine className="size-4" aria-hidden />
                  {t("Refresh")}
                </Button>
              </div>
            ) : null}

            <Field>
              <FieldLabel>{t("Groups")}</FieldLabel>
              <FieldContent>
                <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10 w-full min-w-0 justify-between gap-2"
                        aria-label={t("Groups")}
                        disabled={loading || Boolean(loadError) || submitting}
                      >
                        <span className="truncate">{groups.length ? groups.join(", ") : t("Select Group")}</span>
                        <RiArrowDownSLine className="size-4 text-muted-foreground" aria-hidden />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t("Search Group")} />
                      <CommandList>
                        <CommandEmpty>{t("No Data")}</CommandEmpty>
                        <CommandGroup>
                          {groupsList.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.label}
                              onSelect={() => toggleGroup(option.value)}
                            >
                              <RiCheckLine
                                className={cn(
                                  "me-2 size-4",
                                  groups.includes(option.value) ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span>{option.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {groups.length > 0 && (
                  <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                    {groups.map((value) => (
                      <Badge key={value} variant="secondary" className="h-auto max-w-full whitespace-normal">
                        <span className="min-w-0 break-all">{value}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Policy")}</FieldLabel>
              <FieldContent>
                <Popover open={policyOpen} onOpenChange={setPolicyOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10 w-full min-w-0 justify-between gap-2"
                        aria-label={t("Policy")}
                        disabled={loading || Boolean(loadError) || submitting}
                      >
                        <span className="truncate">
                          {policies.length ? policies.join(", ") : t("Select user group policies")}
                        </span>
                        <RiArrowDownSLine className="size-4 text-muted-foreground" aria-hidden />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t("Search Policy")} />
                      <CommandList>
                        <CommandEmpty>{t("No Data")}</CommandEmpty>
                        <CommandGroup>
                          {policiesList.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.label}
                              onSelect={() => togglePolicy(option.value)}
                            >
                              <RiCheckLine
                                className={cn(
                                  "me-2 size-4",
                                  policies.includes(option.value) ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span>{option.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {policies.length > 0 && (
                  <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                    {policies.map((value) => (
                      <Badge key={value} variant="secondary" className="h-auto max-w-full whitespace-normal">
                        <span className="min-w-0 break-all">{value}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </FieldContent>
            </Field>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="default" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  {t("Submit")}
                </span>
              ) : (
                t("Submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
