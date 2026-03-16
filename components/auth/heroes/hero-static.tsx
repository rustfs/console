"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ThemeLogo } from "@/components/theme/logo"
import { getThemeManifest } from "@/lib/theme/manifest"
import { buildRoute } from "@/lib/routes"
import { RiArrowRightLongFill } from "@remixicon/react"
import { FlipWords } from "@/components/ui/flip-words"

export function AuthHeroStatic() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.split("-")[0] ?? "en"
  const theme = getThemeManifest()

  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-8 overflow-hidden border-e bg-gray-50 p-16 dark:border-none dark:bg-black">
      <div className="z-10 flex max-w-7xl flex-col">
        <ThemeLogo width={112} height={24} className="max-w-28" alt={theme.brand.name} />
        <div className="my-6 px-0 text-4xl font-semibold text-primary">
          <span className={locale !== "zh" ? "pe-1" : undefined}>{t("Rust-based")} </span>
          <FlipWords
            words={[
              t("High Performance"),
              t("Infinite Scaling"),
              t("Secure & Reliable"),
              t("Multi-Cloud Storage"),
              t("S3 Compatible"),
            ]}
            duration={3000}
            className="text-4xl font-semibold text-primary"
          />
          <div className="mt-2 text-muted-foreground">{t("Reliable distributed file system")}</div>
        </div>
      </div>
      <Link
        href="https://www.rustfs.com"
        className="z-10 inline-flex w-max items-center gap-2 rounded-full border border-blue-500 p-2 px-5 leading-none text-primary-500"
      >
        <span>{t("Visit website")}</span>
        <RiArrowRightLongFill className="me-2 rtl:-scale-x-100" />
      </Link>
      <div className="absolute inset-0 z-0 h-full">
        <Image src={buildRoute("/backgrounds/ttten.svg")} alt="" fill className="object-cover opacity-45" />
      </div>
    </div>
  )
}
