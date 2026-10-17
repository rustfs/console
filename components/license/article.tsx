"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { buildRoute } from "@/lib/routes"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { SectionNavigation } from "@/components/section-navigation"
import { getLicenseSections } from "@/lib/license-sections"

export function LicenseArticle() {
  const { t } = useTranslation()
  const [licenseContent, setLicenseContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadLicense = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch(buildRoute("/legal/LICENSE"))
      if (!response.ok) throw new Error("License request failed")
      setLicenseContent(await response.text())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadLicense()
  }, [loadLicense])
  const sections = useMemo(() => getLicenseSections(licenseContent), [licenseContent])

  return (
    <Page>
      <PageHeader description={t("Version 2.0, January 2004")}>
        <h1 className="text-2xl font-bold">{t("License")}</h1>
      </PageHeader>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-4 border border-destructive/30 p-4 text-sm">
          <p>{t("Failed to get data")}</p>
          <Button variant="outline" onClick={() => void loadLicense()} disabled={loading}>
            {t("Retry")}
          </Button>
        </div>
      ) : null}
      {loading && !licenseContent ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Loading…")}
        </p>
      ) : licenseContent ? (
        <div className="grid items-start gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <SectionNavigation items={sections.map((section) => ({ href: `#${section.id}`, label: section.title }))} />
          <article className="max-w-3xl border-t pt-6" aria-label={t("Apache License")}>
            {sections.map((section) => (
              <section key={section.id} id={section.id} aria-label={section.title} className="scroll-mt-24">
                <pre className="whitespace-pre-line break-words text-start font-sans text-sm leading-7 text-muted-foreground">
                  {section.content}
                </pre>
              </section>
            ))}
          </article>
        </div>
      ) : null}
    </Page>
  )
}
