"use client"

import { Page } from "@/components/page"
import { LicenseArticle } from "@/components/license/article"
import { LicenseEnterpriseSection } from "@/components/license/enterprise-section"

const hasLicense = false

export default function LicensePage() {
  if (hasLicense) {
    return (
      <Page>
        <LicenseEnterpriseSection />
      </Page>
    )
  }

  return <LicenseArticle />
}
