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
    <div className="auth-poster relative flex min-h-full w-full flex-col justify-between gap-10 overflow-hidden border-e bg-muted/50 p-12 xl:p-16">
      <ThemeLogo width={144} height={28} alt={theme.brand.name} priority />
      <div className="auth-data-field flex flex-1 items-center py-8" aria-hidden="true">
        <svg viewBox="0 0 600 300" className="w-full overflow-visible" fill="none">
          <path d="M40 150H560M300 32V268" stroke="var(--border)" strokeDasharray="3 7" />
          {[0, 1, 2].map((node) => (
            <g key={node} transform={`translate(${24 + node * 208} ${node === 1 ? 32 : 64})`}>
              <rect width="136" height="204" fill="var(--background)" stroke="var(--border)" />
              <path d="M0 36H136" stroke="var(--border)" />
              <rect x="16" y="15" width="6" height="6" fill="var(--brand)" />
              <path d="M94 18H120" stroke="var(--muted-foreground)" strokeWidth="2" />
              {Array.from({ length: 6 }, (_, row) => (
                <g key={row} transform={`translate(16 ${52 + row * 23})`}>
                  {[0, 1, 2, 3].map((column) => (
                    <rect
                      key={column}
                      x={column * 27}
                      width="23"
                      height="15"
                      fill={
                        (row + column + node) % 5 === 0
                          ? "var(--parity)"
                          : (row + column + node) % 3 === 0
                            ? "var(--brand)"
                            : "var(--selection)"
                      }
                    />
                  ))}
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="relative space-y-4">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-link">{t("S3 Compatible")}</p>
        <h2 className="max-w-xl font-heading text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl">
          {t("Reliable distributed file system")}
        </h2>
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-6">
        <p className="text-sm text-muted-foreground">{t("Rust-based")}</p>
        <Link
          href={withUtm(theme.links.website ?? "https://www.rustfs.com", "login-hero")}
          className="group inline-flex min-h-10 items-center gap-3 text-sm font-medium transition-colors hover:text-link"
        >
          <span>{t("Visit website")}</span>
          <RiArrowRightLongFill
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1 motion-reduce:transform-none"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  )
}
