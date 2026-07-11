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
    <div className="relative flex h-full w-full flex-col justify-center gap-10 overflow-hidden border-e bg-muted/40 p-12 xl:p-16">
      <div className="z-10 flex max-w-lg flex-col">
        <ThemeLogo width={112} height={24} alt={theme.brand.name} priority />
        <div className="my-7 px-0 font-heading text-3xl font-semibold leading-tight tracking-tight text-primary xl:text-4xl">
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
            className="font-heading text-3xl font-semibold leading-tight tracking-tight text-primary xl:text-4xl"
          />
          <div className="mt-3 text-pretty text-muted-foreground">{t("Reliable distributed file system")}</div>
        </div>
      </div>
      <Link
        href="https://www.rustfs.com"
        className="z-10 inline-flex h-10 w-max items-center gap-2 rounded-none border border-primary/30 px-5 leading-none text-primary transition-colors hover:bg-accent"
      >
        <span>{t("Visit website")}</span>
        <RiArrowRightLongFill className="me-2 size-4 rtl:-scale-x-100" aria-hidden />
      </Link>
      <div className="absolute inset-0 z-0 h-full">
        <Image
          src={buildRoute("/backgrounds/ttten.svg")}
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-55"
        />
      </div>
    </div>
  )
}
