"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { buildRoute } from "@/lib/routes"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export function LicenseArticle() {
  const { t } = useTranslation()
  const [licenseContent, setLicenseContent] = useState("")

  useEffect(() => {
    fetch(buildRoute("/legal/LICENSE"))
      .then((res) => res.text())
      .then(setLicenseContent)
      .catch(() => setLicenseContent("License text not available."))
  }, [])

  return (
    <Page className="max-w-5xl">
      <PageHeader>
        <h1 className="text-2xl font-bold">{t("License")}</h1>
      </PageHeader>

      <Card className="space-y-4 shadow-none">
        <CardContent className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold">{t("Apache License")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("Version 2.0, January 2004")}</p>
          </div>
          <ScrollArea className="h-[min(70dvh,48rem)] min-h-[28rem] border">
            <pre className="whitespace-pre-line break-words p-4 text-start text-sm leading-6 text-foreground/80 sm:p-6">
              {licenseContent || t("Loading…")}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </Page>
  )
}
