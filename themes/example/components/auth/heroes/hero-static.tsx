"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiArrowRightLongFill } from "@remixicon/react"
import { FlipWords } from "@/components/ui/flip-words"
import logoImage from "@/assets/logo.svg"
import { buildRoute } from "@/lib/routes"
import { getThemeManifest } from "@/lib/theme/manifest"

export function AuthHeroStatic() {
  const { t } = useTranslation()
  const manifest = getThemeManifest()

  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-8 overflow-hidden border-e bg-teal-50 p-16 dark:border-none dark:bg-teal-950/20">
      <div className="z-10 flex max-w-7xl flex-col">
        <Image src={logoImage} alt={manifest.brand.name} width={156} height={38} className="h-9 w-auto" />
        <div className="my-6 px-0 text-4xl font-semibold text-teal-700 dark:text-teal-300">
          <span>{t("Acme theme activated")}</span>
          <FlipWords
            words={[t("Key-level locale override"), t("Component path override"), t("Asset override")]}
            duration={2600}
            className="ms-2 text-4xl font-semibold text-teal-700 dark:text-teal-300"
          />
          <div className="mt-2 text-teal-900/70 dark:text-teal-100/70">{t("Public assets are overridden too")}</div>
        </div>
      </div>
      <Link
        href={manifest.links.website ?? "https://example.com"}
        className="z-10 inline-flex w-max items-center gap-2 rounded-full border border-teal-600 bg-white/80 p-2 px-5 leading-none text-teal-700 dark:bg-teal-900/40 dark:text-teal-200"
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
