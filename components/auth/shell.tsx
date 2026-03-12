"use client"

import * as React from "react"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { brand } from "@/config/brand"
import { buildRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  sideTitle?: string
  sideDescription?: string
  utilitySlot?: React.ReactNode
  footerSlot?: React.ReactNode
  children: React.ReactNode
}

export function AuthShell({
  eyebrow,
  title,
  description,
  sideTitle,
  sideDescription,
  utilitySlot,
  footerSlot,
  children,
}: AuthShellProps) {
  const { t } = useTranslation()

  const featureChips = [t("High Performance"), t("Secure & Reliable"), t("Multi-Cloud Storage")]

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950 text-white">
      <Image
        src={buildRoute(brand.authBackgroundPath)}
        alt=""
        fill
        priority
        className="object-cover opacity-28"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.84)_44%,rgba(30,41,59,0.74))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] opacity-8" />

      <div className="relative flex h-full items-center justify-center p-3 lg:p-5">
        <div className="grid h-full max-h-[960px] w-full max-w-[1320px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/44 shadow-[0_24px_90px_rgba(15,23,42,0.48)] backdrop-blur-md lg:grid-cols-[1fr_0.94fr]">
          <section className="hidden flex-col justify-between border-r border-white/8 bg-slate-950/26 px-7 py-8 lg:flex xl:px-9 xl:py-9">
            <div className="space-y-8">
              <div className="space-y-5">
                <Image
                  src={buildRoute(brand.logoPath)}
                  alt={brand.productName}
                  width={144}
                  height={32}
                  className="h-6 w-auto"
                />
                <div className="inline-flex rounded-full border border-white/15 bg-white/6 px-3 py-1 text-xs font-medium tracking-[0.24em] text-white/80 uppercase">
                  {eyebrow}
                </div>
              </div>

              <div className="max-w-xl space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-white xl:text-[2.6rem]">{sideTitle ?? brand.title}</h1>
                <p className="max-w-lg text-sm leading-7 text-white/70 xl:text-base">
                  {sideDescription ?? brand.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {featureChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/6 px-3.5 py-1.5 text-xs font-medium text-white/82"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.18fr_0.82fr]">
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-5">
                <div className="text-xs font-medium tracking-[0.24em] text-white/55 uppercase">{brand.companyName}</div>
                <div className="mt-3 text-xl font-semibold leading-tight text-white">{brand.productName}</div>
                <p className="mt-2.5 text-sm leading-6 text-white/66">{brand.description}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/32 p-5">
                <div className="text-xs font-medium tracking-[0.24em] text-white/55 uppercase">{t("S3 Compatible")}</div>
                <div className="mt-4 text-[2rem] font-semibold text-white">24/7</div>
                <p className="mt-2.5 text-sm leading-6 text-white/66">{t("Reliable distributed file system")}</p>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col bg-slate-50/88 text-slate-950 backdrop-blur-2xl dark:bg-slate-900/62 dark:text-white">
            <div className="flex items-center justify-end gap-2 px-4 py-4 sm:px-5">
              {utilitySlot}
            </div>

            <div className="mx-auto flex min-h-0 w-full max-w-[500px] flex-1 flex-col justify-center px-5 pb-6 pt-1 sm:px-7 lg:px-8">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/78 p-5 shadow-[0_20px_64px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-7">
                <div className="mb-7 space-y-4">
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium tracking-[0.24em] text-slate-600 uppercase dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                    {eyebrow}
                  </div>
                  <Image
                    src={buildRoute(brand.logoPath)}
                    alt={brand.productName}
                    width={136}
                    height={30}
                    className="h-6 w-auto"
                  />
                  <div className="space-y-3">
                    <h2 className="text-[2rem] font-semibold tracking-tight">{title}</h2>
                    <p className="text-sm leading-6 text-slate-600 dark:text-white/68">{description}</p>
                  </div>
                </div>

                <div className={cn("space-y-6")}>{children}</div>
              </div>

              {footerSlot ? <div className="mt-4">{footerSlot}</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
