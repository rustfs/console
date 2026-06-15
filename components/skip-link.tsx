"use client"

import { useTranslation } from "react-i18next"

export function SkipLink() {
  const { t } = useTranslation()

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-[calc(env(safe-area-inset-top)+1rem)] focus:z-50 focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {t("Skip to main content")}
    </a>
  )
}
