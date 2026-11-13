"use client"

import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePermissions } from "@/hooks/use-permissions"
import type { RecoveryClient } from "@/lib/recovery"
import { RecoveryDetails } from "./details"
import { RecoveryIntegrity } from "./integrity"
import { RecoveryList, type MrfTarget } from "./list"
import { RecoverySummary } from "./summary"

export function RecoveryManagement({ client }: { client: RecoveryClient }) {
  const { t } = useTranslation()
  const { canCapability } = usePermissions()
  const canMrf = canCapability("recovery.mrf")
  const canJobs = canCapability("recovery.jobs.view")
  const canReadiness = canCapability("recovery.readiness.view")
  const [selected, setSelected] = useState<MrfTarget | null>(null)
  const [summaryRevision, setSummaryRevision] = useState(0)
  const [tab, setTab] = useState(canMrf ? "responsibilities" : "integrity")
  const inspect = useCallback((target: MrfTarget) => setSelected(target), [])
  const changed = useCallback(() => setSummaryRevision((value) => value + 1), [])
  return (
    <Page>
      <PageHeader
        description={t(
          "Understand retained recovery work, make traceable decisions, and retrieve independent verification results.",
        )}
      >
        <h1 className="text-2xl font-bold">{t("Recovery & Integrity")}</h1>
      </PageHeader>
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="gap-7">
        <TabsList variant="line" className="h-auto min-h-11 max-w-full flex-wrap justify-start">
          <TabsTrigger value="responsibilities" className="min-h-11 px-3">
            {t("Recovery responsibilities")}
          </TabsTrigger>
          <TabsTrigger value="integrity" className="min-h-11 px-3">
            {t("Independent verification")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="responsibilities" className="flex min-w-0 flex-col gap-8">
          <RecoverySummary key={summaryRevision} enabled={canMrf && tab === "responsibilities"} />
          <RecoveryList enabled={canMrf && tab === "responsibilities"} onInspect={inspect} />
        </TabsContent>
        <TabsContent value="integrity">
          <RecoveryIntegrity
            client={client}
            canReadJobs={canJobs && tab === "integrity"}
            canReadReadiness={canReadiness && tab === "integrity"}
          />
        </TabsContent>
      </Tabs>
      {selected && (
        <RecoveryDetails
          key={`${selected.nodeId}:${selected.responsibility.responsibilityId}`}
          client={client}
          target={selected}
          enabled={canMrf}
          onClose={() => setSelected(null)}
          onChanged={changed}
        />
      )}
    </Page>
  )
}
