"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ThemeLogo } from "@/components/theme/logo"
import { getThemeManifest } from "@/lib/theme/manifest"
import { withUtm } from "@/lib/utm"
import { RiArrowRightLongFill } from "@remixicon/react"

export function AuthHeroStatic() {
  const { t } = useTranslation()
  const theme = getThemeManifest()

  return (
    <div className="flex h-full w-full flex-col justify-between gap-12 border-e bg-muted p-12 xl:p-16">
      <ThemeLogo width={144} height={28} alt={theme.brand.name} priority />
      <div className="space-y-6">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-link">{t("S3 Compatible")}</p>
        <h2 className="font-heading text-4xl font-bold leading-tight text-foreground">{t("Rust-based")}</h2>
        <p className="max-w-sm text-xl leading-relaxed text-muted-foreground">
          {t("Reliable distributed file system")}
        </p>
        <Link
          href={withUtm(theme.links.website ?? "https://www.rustfs.com", "login-hero")}
          className="inline-flex min-h-10 items-center gap-3 border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          <span>{t("Visit website")}</span>
          <RiArrowRightLongFill className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={`size-6 ${index < 4 ? "bg-brand" : "bg-parity"}`} />
        ))}
      </div>
    </div>
  )
}
