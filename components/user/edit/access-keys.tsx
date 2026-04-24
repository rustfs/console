"use client"

import * as React from "react"
import dayjs from "dayjs"
import { RiAddLine, RiDeleteBin5Line, RiEdit2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SearchInput } from "@/components/search-input"
import { DateTimePicker } from "@/components/datetime-picker"
import { DataTable } from "@/components/data-table/data-table"
import { UserNotice, type CredentialsData } from "@/components/user/notice"
import { useDataTable } from "@/hooks/use-data-table"
import { useUsers } from "@/hooks/use-users"
import { useAccessKeys } from "@/hooks/use-access-keys"
import { usePermissions } from "@/hooks/use-permissions"
import { usePolicies } from "@/hooks/use-policies"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { makeRandomString } from "@/lib/functions"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import type { ColumnDef } from "@tanstack/react-table"

interface UserEditAccessKeysProps {
  userName: string
}

interface AccessKeyRow {
  accessKey: string
  expiration?: string | null
  name?: string
  description?: string
  accountStatus?: string
  impliedPolicy?: boolean
  policy?: unknown
}

interface AccessKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  onSuccess: () => void
  onNotice?: (data: CredentialsData) => void
}

interface EditDialogProps extends AccessKeyDialogProps {
  row: AccessKeyRow | null
}

function formatExpiration(value?: string | null) {
  if (!value || value === "9999-01-01T00:00:00Z") return "-"
  const date = dayjs(value)
  if (!date.isValid()) return "-"
  return date.format("YYYY-MM-DD HH:mm")
}

function formatPolicy(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value) as Record<string, unknown>, null, 2)
    } catch {
      return value
    }
  }

  return JSON.stringify(value ?? {}, null, 2)
}

function UserAccessKeysNewDialog({ open, onOpenChange, userName, onSuccess, onNotice }: AccessKeyDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { createAUserServiceAccount } = useUsers()
  const { getPolicyByUserName } = usePolicies()

  const [accessKey, setAccessKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [expiry, setExpiry] = React.useState<string | null>(null)
  const [policy, setPolicy] = React.useState("{}")
  const [parentPolicy, setParentPolicy] = React.useState("{}")
  const [impliedPolicy, setImpliedPolicy] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState({
    accessKey: "",
    secretKey: "",
    name: "",
  })

  const minExpiry = React.useMemo(() => new Date().toISOString(), [])

  React.useEffect(() => {
    if (!open) return

    try {
      setAccessKey(makeRandomString(20))
      setSecretKey(makeRandomString(40))
    } catch {
      setAccessKey("")
      setSecretKey("")
      message.error(t("Failed to generate secure random keys"))
    }

    setName("")
    setDescription("")
    setExpiry(null)
    setImpliedPolicy(true)
    setErrors({ accessKey: "", secretKey: "", name: "" })

    getPolicyByUserName(userName)
      .then((result) => {
        const value = JSON.stringify(result ?? {}, null, 2)
        setParentPolicy(value)
        setPolicy(value)
      })
      .catch(() => {
        setParentPolicy("{}")
        setPolicy("{}")
      })
  }, [getPolicyByUserName, message, open, t, userName])

  React.useEffect(() => {
    if (impliedPolicy) {
      setPolicy(parentPolicy)
    }
  }, [impliedPolicy, parentPolicy])

  const closeModal = () => {
    onOpenChange(false)
  }

  const validate = () => {
    const nextErrors = { accessKey: "", secretKey: "", name: "" }

    if (!accessKey) {
      nextErrors.accessKey = t("Please enter Access Key")
    } else if (accessKey.length < 3 || accessKey.length > 20) {
      nextErrors.accessKey = t("Access Key length must be between 3 and 20 characters")
    }

    if (!secretKey) {
      nextErrors.secretKey = t("Please enter Secret Key")
    } else if (secretKey.length < 8 || secretKey.length > 40) {
      nextErrors.secretKey = t("Secret Key length must be between 8 and 40 characters")
    }

    if (!name) {
      nextErrors.name = t("Please enter name")
    }

    setErrors(nextErrors)
    return !nextErrors.accessKey && !nextErrors.secretKey && !nextErrors.name
  }

  const submitForm = async () => {
    if (!validate()) {
      message.error(t("Please fill in the correct format"))
      return
    }

    setSubmitting(true)
    try {
      let customPolicy: string | null = null
      if (!impliedPolicy) {
        try {
          customPolicy = JSON.stringify(JSON.parse(policy || "{}") as Record<string, unknown>)
        } catch {
          message.error(t("Policy format invalid"))
          setSubmitting(false)
          return
        }
      }

      const payload = {
        accessKey,
        secretKey,
        name,
        description,
        policy: customPolicy,
        expiration: expiry ? expiry : "9999-01-01T00:00:00.000Z",
      }

      const result = (await createAUserServiceAccount(userName, payload)) as CredentialsData
      message.success(t("Added successfully"))
      onNotice?.(result)
      closeModal()
      onSuccess()
    } catch (error) {
      console.error(error)
      message.error(t("Add failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className={cn("sm:max-w-xl", !impliedPolicy && "sm:max-w-6xl")}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Create Key")}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[80vh] flex-col gap-4 overflow-auto px-2 -mx-2 lg:flex-row">
          <div
            className={cn(
              impliedPolicy ? "flex flex-1 flex-col gap-4" : "flex w-full flex-col gap-4 lg:w-72 lg:shrink-0",
            )}
          >
            <Field>
              <FieldLabel htmlFor="create-user-access-key">{t("Access Key")}</FieldLabel>
              <FieldContent>
                <Input
                  id="create-user-access-key"
                  value={accessKey}
                  onChange={(event) => setAccessKey(event.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
              {errors.accessKey ? (
                <FieldDescription className="text-destructive">{errors.accessKey}</FieldDescription>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-user-secret-key">{t("Secret Key")}</FieldLabel>
              <FieldContent>
                <Input
                  id="create-user-secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
              {errors.secretKey ? (
                <FieldDescription className="text-destructive">{errors.secretKey}</FieldDescription>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-user-expiry">
                {t("Expiry")}({t("empty is indicates permanent validity")})
              </FieldLabel>
              <FieldContent>
                <DateTimePicker
                  id="create-user-expiry"
                  value={expiry}
                  onChange={setExpiry}
                  min={minExpiry}
                  placeholder={t("Please select expiry date")}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="create-user-key-name">{t("Name")}</FieldLabel>
              <FieldContent>
                <Input
                  id="create-user-key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
              {errors.name ? <FieldDescription className="text-destructive">{errors.name}</FieldDescription> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-user-key-description">{t("Description")}</FieldLabel>
              <FieldContent>
                <Textarea
                  id="create-user-key-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </FieldContent>
            </Field>

            <Field orientation="responsive" className="items-start gap-3 rounded-md border p-3">
              <FieldLabel className="text-sm font-medium">{t("Use main account policy")}</FieldLabel>
              <FieldContent className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <p className="text-xs text-muted-foreground">
                  {t("Automatically inherit the main account policy when enabled.")}
                </p>
                <Switch checked={impliedPolicy} onCheckedChange={setImpliedPolicy} />
              </FieldContent>
            </Field>
          </div>

          {!impliedPolicy ? (
            <div className="flex-1 max-h-[60vh] overflow-auto">
              <Field className="h-full">
                <FieldLabel>{t("Current user policy")}</FieldLabel>
                <FieldContent className="h-full">
                  <Textarea
                    value={policy}
                    onChange={(event) => setPolicy(event.target.value)}
                    className="h-full min-h-[200px] font-mono text-xs"
                  />
                </FieldContent>
              </Field>
            </div>
          ) : null}
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

function UserAccessKeysEditDialog({ open, onOpenChange, userName, row, onSuccess }: EditDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { getServiceAccount, updateServiceAccount } = useAccessKeys()
  const { getPolicyByUserName } = usePolicies()

  const [accessKey, setAccessKey] = React.useState("")
  const [policy, setPolicy] = React.useState("{}")
  const [parentPolicy, setParentPolicy] = React.useState("{}")
  const [impliedPolicy, setImpliedPolicy] = React.useState(true)
  const [expiry, setExpiry] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState<"on" | "off">("on")
  const [submitting, setSubmitting] = React.useState(false)

  const minExpiry = React.useMemo(() => dayjs().toISOString(), [])

  React.useEffect(() => {
    if (!open || !row?.accessKey) return

    Promise.all([getServiceAccount(row.accessKey), getPolicyByUserName(userName)])
      .then(([result, parentUserPolicy]) => {
        const response = result as {
          impliedPolicy?: boolean
          policy?: unknown
          expiration?: string
          name?: string
          description?: string
          accountStatus?: string
        }

        const parentPolicyValue = JSON.stringify(parentUserPolicy ?? {}, null, 2)
        const nextImpliedPolicy =
          typeof response.impliedPolicy === "boolean" ? response.impliedPolicy : response.policy == null

        setAccessKey(row.accessKey)
        setParentPolicy(parentPolicyValue)
        setImpliedPolicy(nextImpliedPolicy)
        setPolicy(nextImpliedPolicy ? parentPolicyValue : formatPolicy(response.policy))
        setExpiry(
          response.expiration && response.expiration !== "9999-01-01T00:00:00Z"
            ? dayjs(response.expiration).toISOString()
            : null,
        )
        setName(response.name ?? "")
        setDescription(response.description ?? "")
        setStatus((response.accountStatus as "on" | "off") ?? "on")
      })
      .catch(() => {
        message.error(t("Failed to get data"))
      })
  }, [getPolicyByUserName, getServiceAccount, message, open, row?.accessKey, t, userName])

  React.useEffect(() => {
    if (impliedPolicy) {
      setPolicy(parentPolicy)
    }
  }, [impliedPolicy, parentPolicy])

  const closeModal = () => {
    onOpenChange(false)
  }

  const submitForm = async () => {
    if (!accessKey) return

    setSubmitting(true)
    try {
      let customPolicy: string | null = null
      if (!impliedPolicy) {
        try {
          customPolicy = JSON.stringify(JSON.parse(policy || "{}") as Record<string, unknown>)
        } catch {
          message.error(t("Policy format invalid"))
          setSubmitting(false)
          return
        }
      }

      await updateServiceAccount(accessKey, {
        newPolicy: customPolicy,
        newStatus: status,
        newName: name,
        newDescription: description,
        newExpiration: expiry ? dayjs(expiry).toISOString() : null,
      })
      message.success(t("Updated successfully"))
      closeModal()
      onSuccess()
    } catch (error) {
      console.error(error)
      message.error(t("Update failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className={cn("sm:max-w-xl", !impliedPolicy && "sm:max-w-6xl")}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Edit Key")}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[80vh] flex-col gap-4 overflow-auto px-2 -mx-2 lg:flex-row">
          <div
            className={cn(
              impliedPolicy ? "flex flex-1 flex-col gap-4" : "flex w-full flex-col gap-4 lg:w-72 lg:shrink-0",
            )}
          >
            <Field>
              <FieldLabel>{t("Access Key")}</FieldLabel>
              <FieldContent>
                <Input value={accessKey} disabled />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Expiry")}</FieldLabel>
              <FieldContent>
                <DateTimePicker value={expiry} onChange={setExpiry} min={minExpiry} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Name")}</FieldLabel>
              <FieldContent>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Description")}</FieldLabel>
              <FieldContent>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
              </FieldContent>
            </Field>

            <Field orientation="responsive" className="items-start gap-3 rounded-md border p-3">
              <FieldLabel className="text-sm font-medium">{t("Use main account policy")}</FieldLabel>
              <FieldContent className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <p className="text-xs text-muted-foreground">
                  {t("Automatically inherit the main account policy when enabled.")}
                </p>
                <Switch checked={impliedPolicy} onCheckedChange={setImpliedPolicy} />
              </FieldContent>
            </Field>

            <Field orientation="responsive">
              <FieldLabel className="text-sm font-medium">{t("Status")}</FieldLabel>
              <FieldContent className="flex justify-end">
                <Switch checked={status === "on"} onCheckedChange={(checked) => setStatus(checked ? "on" : "off")} />
              </FieldContent>
            </Field>
          </div>

          {!impliedPolicy ? (
            <div className="flex-1 max-h-[60vh] overflow-auto">
              <Field className="h-full">
                <FieldLabel>{t("Current user policy")}</FieldLabel>
                <FieldContent className="h-full">
                  <Textarea
                    value={policy}
                    onChange={(event) => setPolicy(event.target.value)}
                    className="h-full min-h-[200px] font-mono text-xs"
                  />
                </FieldContent>
              </Field>
            </div>
          ) : null}
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

export function UserEditAccessKeys({ userName }: UserEditAccessKeysProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { canCapability } = usePermissions()
  const { listAllUserServiceAccounts } = useUsers()
  const { deleteServiceAccount } = useAccessKeys()

  const canCreateAccessKey = canCapability("accessKeys.create")
  const canEditAccessKey = canCapability("accessKeys.edit")
  const canDeleteAccessKey = canCapability("accessKeys.delete")

  const [data, setData] = React.useState<AccessKeyRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [newDialogOpen, setNewDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<AccessKeyRow | null>(null)
  const [noticeOpen, setNoticeOpen] = React.useState(false)
  const [noticeData, setNoticeData] = React.useState<CredentialsData | null>(null)

  const loadAccounts = React.useCallback(async () => {
    if (!userName) return

    setLoading(true)
    try {
      const response = (await listAllUserServiceAccounts(userName)) as { accounts?: AccessKeyRow[] }
      setData(response?.accounts ?? [])
    } catch (error) {
      console.error(error)
      message.error(t("Get Data Failed"))
    } finally {
      setLoading(false)
    }
  }, [listAllUserServiceAccounts, message, t, userName])

  React.useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter((row) => row.accessKey.toLowerCase().includes(term))
  }, [data, searchTerm])

  const handleDelete = React.useCallback(
    (row: AccessKeyRow) => {
      dialog.error({
        title: t("Warning"),
        content: t("Are you sure you want to delete this key?"),
        positiveText: t("Confirm"),
        negativeText: t("Cancel"),
        onPositiveClick: async () => {
          try {
            await deleteServiceAccount(row.accessKey)
            message.success(t("Delete Success"))
            await loadAccounts()
          } catch (error) {
            console.error(error)
            message.error((error as Error)?.message || t("Delete Failed"))
          }
        },
      })
    },
    [deleteServiceAccount, dialog, loadAccounts, message, t],
  )

  const columns = React.useMemo<ColumnDef<AccessKeyRow>[]>(
    () => [
      {
        accessorKey: "accessKey",
        header: () => t("Access Key"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.accessKey}</span>,
      },
      {
        accessorKey: "expiration",
        header: () => t("Expiration"),
        cell: ({ row }) => formatExpiration(row.original.expiration),
      },
      {
        accessorKey: "accountStatus",
        header: () => t("Status"),
        cell: ({ row }) => (
          <Badge variant={row.original.accountStatus === "on" ? "secondary" : "destructive"}>
            {row.original.accountStatus === "on" ? t("Available") : t("Disabled")}
          </Badge>
        ),
      },
      {
        accessorKey: "name",
        header: () => t("Name"),
        cell: ({ row }) => <span>{row.original.name || "-"}</span>,
      },
      {
        accessorKey: "description",
        header: () => t("Description"),
        cell: ({ row }) => <span>{row.original.description || "-"}</span>,
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        enableHiding: false,
        meta: { width: 180 },
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            {canEditAccessKey ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditRow(row.original)
                  setEditDialogOpen(true)
                }}
              >
                <RiEdit2Line className="size-4" />
                <span>{t("Edit")}</span>
              </Button>
            ) : null}
            {canDeleteAccessKey ? (
              <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(row.original)}>
                <RiDeleteBin5Line className="size-4" />
                <span>{t("Delete")}</span>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDeleteAccessKey, canEditAccessKey, handleDelete, t],
  )

  const { table } = useDataTable<AccessKeyRow>({
    data: filteredData,
    columns,
    getRowId: (row) => row.accessKey,
    disablePagination: true,
  })

  const handleNotice = React.useCallback((result: CredentialsData) => {
    setNoticeData(result)
    setNoticeOpen(true)
  }, [])

  const handleNoticeClose = React.useCallback(() => {
    setNoticeData(null)
    void loadAccounts()
  }, [loadAccounts])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("Search Access Key")}
          clearable
          className="w-full sm:max-w-xs"
        />
        {canCreateAccessKey ? (
          <Button type="button" variant="outline" onClick={() => setNewDialogOpen(true)}>
            <RiAddLine className="size-4" />
            <span>{t("Add Access Key")}</span>
          </Button>
        ) : null}
      </div>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Access Keys")}
        emptyDescription={t("Create a new access key to get started.")}
        tableClass="min-w-full"
      />

      <UserAccessKeysNewDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        userName={userName}
        onSuccess={loadAccounts}
        onNotice={handleNotice}
      />

      <UserAccessKeysEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        userName={userName}
        row={editRow}
        onSuccess={loadAccounts}
      />

      <UserNotice
        open={noticeOpen}
        onOpenChange={setNoticeOpen}
        data={noticeData}
        onClose={handleNoticeClose}
        title={t("New access key has been created")}
      />
    </div>
  )
}
