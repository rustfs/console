"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useMessage } from "@/lib/ui/message"
import { useUsers } from "@/hooks/use-users"
import { usePolicies } from "@/hooks/use-policies"
import { useGroups } from "@/hooks/use-groups"
import { cn } from "@/lib/utils"

interface UserNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

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
  const [errors, setErrors] = React.useState({ accessKey: "", secretKey: "" })

  React.useEffect(() => {
    if (open) {
      setAccessKey("")
      setSecretKey("")
      setGroups([])
      setPolicies([])
      setErrors({ accessKey: "", secretKey: "" })
      Promise.all([
        listGroup().then((res: string[]) =>
          setGroupsList((res ?? []).map((g) => ({ label: g, value: g })))
        ),
        listPolicies().then((res: Record<string, unknown>) =>
          setPoliciesList(
            Object.keys(res ?? {}).map((p) => ({ label: p, value: p }))
          )
        ),
      ]).catch(() => {})
    }
  }, [open, listGroup, listPolicies])

  const toggleGroup = (value: string) => {
    setGroups((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    )
  }

  const togglePolicy = (value: string) => {
    setPolicies((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    )
  }

  const closeModal = () => onOpenChange(false)

  const validate = () => {
    const newErrors = { accessKey: "", secretKey: "" }
    if (!accessKey.trim()) {
      newErrors.accessKey = t("Please enter username")
    } else if (!/^.{3,20}$/.test(accessKey.trim())) {
      newErrors.accessKey = t("username length cannot be less than 3 characters and greater than 20 characters")
    }
    if (!secretKey.trim()) {
      newErrors.secretKey = t("Please enter password")
    } else if (!/^.{8,40}$/.test(secretKey)) {
      newErrors.secretKey = t("password length cannot be less than 8 characters and greater than 40 characters")
    }
    setErrors(newErrors)
    return !newErrors.accessKey && !newErrors.secretKey
  }

  const submitForm = async () => {
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
            })
          )
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
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Create User")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[80vh] overflow-auto px-2 -mx-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>{t("User Name")}</FieldLabel>
              <FieldContent>
                <Input
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  minLength={4}
                  name="new-user-access-key"
                  autoComplete="new-user-access-key"
                />
              </FieldContent>
              {errors.accessKey && (
                <FieldDescription className="text-destructive">{errors.accessKey}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel>{t("Password")}</FieldLabel>
              <FieldContent>
                <Input
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  type="password"
                  minLength={8}
                  name="new-user-password"
                  autoComplete="new-user-password"
                />
              </FieldContent>
              {errors.secretKey && (
                <FieldDescription className="text-destructive">{errors.secretKey}</FieldDescription>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("Groups")}</FieldLabel>
            <FieldContent>
              <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 justify-between gap-2"
                    aria-label={t("Groups")}
                  >
                    <span className="truncate">
                      {groups.length ? groups.join(", ") : t("Select Group")}
                    </span>
                    <RiArrowDownSLine className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
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
                              className={cn("mr-2 size-4", groups.includes(option.value) ? "opacity-100" : "opacity-0")}
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {groups.map((value) => (
                    <Badge key={value} variant="secondary">
                      {value}
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
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 justify-between gap-2"
                    aria-label={t("Policy")}
                  >
                    <span className="truncate">
                      {policies.length ? policies.join(", ") : t("Select user group policies")}
                    </span>
                    <RiArrowDownSLine className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
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
                              className={cn("mr-2 size-4", policies.includes(option.value) ? "opacity-100" : "opacity-0")}
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {policies.map((value) => (
                    <Badge key={value} variant="secondary">
                      {value}
                    </Badge>
                  ))}
                </div>
              )}
            </FieldContent>
          </Field>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={closeModal}>
            {t("Cancel")}
          </Button>
          <Button variant="default" disabled={submitting} onClick={submitForm}>
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
      </DialogContent>
    </Dialog>
  )
}
