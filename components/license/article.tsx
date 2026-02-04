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
    <Page>
      <PageHeader>
        <h1 className="text-2xl font-bold">{t("License")}</h1>
      </PageHeader>

      <Card className="space-y-4 shadow-none">
        <CardContent className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{t("Apache License")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("Version 2.0, January 2004")}</p>
          </div>
          <ScrollArea className="h-[70vh] rounded-lg border">
            <pre className="whitespace-pre-wrap p-6 text-sm leading-6 text-muted-foreground">
              {licenseContent || t("Loading...")}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </Page>
  )
}
