"use client"

import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { RecoveryManagement } from "@/components/recovery/management"
import { Spinner } from "@/components/ui/spinner"
import { useRecoveryClient } from "@/hooks/use-recovery"

export default function RecoveryPage() {
  const { t } = useTranslation()
  const client = useRecoveryClient()
  return client ? (
    <RecoveryManagement key={client.scopeId} client={client} />
  ) : (
    <Page>
      <p role="status" className="flex items-center gap-2">
        <Spinner />
        {t("Loading")}
      </p>
    </Page>
  )
}
