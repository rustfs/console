"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RiCheckLine, RiDownload2Line, RiFileCopyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { download } from "@/lib/export-file"
import { formatRecoveryCodesForExport } from "@/lib/mfa"
import { useMessage } from "@/lib/feedback/message"

interface RecoveryCodesPanelProps {
  codes: string[]
  /** Called once the user confirms they have stored the codes. */
  onAcknowledge: () => void
  acknowledgeLabel: string
  pending?: boolean
}

/**
 * Displays a freshly generated set of recovery codes.
 *
 * The server keeps only hashes, so this is the one and only time these values
 * exist anywhere the user can read them. The panel therefore refuses to be
 * dismissed until the user has copied or downloaded them and confirmed — the
 * alternative is a user who closes a dialog and has silently lost their only
 * way back into a locked account.
 */
export function RecoveryCodesPanel({
  codes,
  onAcknowledge,
  acknowledgeLabel,
  pending = false,
}: RecoveryCodesPanelProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const [saved, setSaved] = useState(false)

  const handleCopy = async () => {
    try {
      await copyToClipboard(formatRecoveryCodesForExport(codes))
      setSaved(true)
      message.success(t("Copy Success"))
    } catch {
      message.error(t("Copy Failed"))
    }
  }

  const handleDownload = () => {
    download("rustfs-recovery-codes.txt", formatRecoveryCodesForExport(codes))
    setSaved(true)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("These codes can be used if you lose access to your authenticator. Each code works once.")}
      </p>

      {/* One frame around the whole set, not one per code: these are a single
          value to copy, not a list of selectable objects. */}
      <ul className="grid grid-cols-1 gap-1 border bg-muted/30 p-3 font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="tabular-nums" dir="ltr">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handleCopy}>
          <RiFileCopyLine className="size-4" aria-hidden />
          <span>{t("Copy")}</span>
        </Button>
        <Button type="button" variant="outline" onClick={handleDownload}>
          <RiDownload2Line className="size-4" aria-hidden />
          <span>{t("Download")}</span>
        </Button>
      </div>

      <p className="text-sm" aria-live="polite">
        {saved ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <RiCheckLine className="size-4" aria-hidden />
            {t("Saved. Store them somewhere only you can reach.")}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("Copy or download the codes before continuing.")}</span>
        )}
      </p>

      <Button type="button" onClick={onAcknowledge} disabled={!saved || pending} className="w-full sm:w-auto">
        {acknowledgeLabel}
      </Button>
    </div>
  )
}
