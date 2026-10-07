import type { TableBucketInfo } from "../hooks/use-table-catalog"
import type { DialogOptions } from "./feedback/dialog"

interface DisableOptions {
  bucket: string
  canManage: boolean
  info: TableBucketInfo | undefined
  disable: (bucket: string) => Promise<TableBucketInfo>
  onDisabled: (bucket: string, info: TableBucketInfo) => void
  dialog: { warning: (options: DialogOptions) => unknown }
  message: { success: (text: string) => unknown; error: (text: string) => unknown }
  t: (key: string) => string
}

export function confirmTableBucketDisable({
  bucket,
  canManage,
  info,
  disable,
  onDisabled,
  dialog,
  message,
  t,
}: DisableOptions) {
  if (!bucket || !canManage || !info?.enabled || !info.disableSupported) return
  dialog.warning({
    title: t("Disable table bucket"),
    content: `${bucket}: ${t("Only an empty catalog can be disabled. Existing objects are preserved. Review bucket lifecycle rules before continuing: expiration can resume and delete objects.")}`,
    positiveText: t("Disable"),
    negativeText: t("Cancel"),
    onPositiveClick: async () => {
      try {
        const updated = await disable(bucket)
        onDisabled(bucket, updated)
        message.success(t("Table bucket disabled"))
      } catch (error) {
        message.error(error instanceof Error && error.message ? error.message : t("Unable to disable table bucket."))
        throw error
      }
    },
  })
}
