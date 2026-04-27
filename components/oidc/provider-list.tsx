"use client"

import { RiAddLine } from "@remixicon/react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { OidcConfigProvider } from "@/types/oidc"

interface ProviderListProps {
  providers: OidcConfigProvider[]
  loading?: boolean
  selectedProviderId: string | null
  canAddProvider?: boolean
  onAddProvider: () => void
  onSelectProvider: (providerId: string) => void
}

function getSourceLabel(source: OidcConfigProvider["source"], t: (key: string) => string) {
  return source === "env" ? t("Environment Managed") : t("Persisted Configuration")
}

export function ProviderList({
  providers,
  loading = false,
  selectedProviderId,
  canAddProvider = true,
  onAddProvider,
  onSelectProvider,
}: ProviderListProps) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-md border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t("OIDC Providers")}</h2>
          <p className="text-xs text-muted-foreground">{t("View and manage persisted OIDC providers.")}</p>
        </div>
        {canAddProvider ? (
          <Button type="button" variant="outline" size="sm" onClick={onAddProvider}>
            <RiAddLine className="size-4" />
            {t("Add Provider")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            <span>{t("Loading...")}</span>
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
            {t("No OIDC providers configured yet.")}
          </div>
        ) : (
          <div className="flex flex-col">
            {providers.map((provider) => {
              const selected = provider.provider_id === selectedProviderId
              const title = provider.display_name.trim() || provider.provider_id

              return (
                <button
                  key={provider.provider_id}
                  type="button"
                  onClick={() => onSelectProvider(provider.provider_id)}
                  className={cn(
                    "flex flex-col items-start gap-2 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40",
                    selected && "bg-muted/60",
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{title}</div>
                      <div className="truncate text-xs text-muted-foreground">{provider.provider_id}</div>
                    </div>
                    <Badge variant={provider.enabled ? "secondary" : "outline"}>
                      {provider.enabled ? t("Enabled") : t("Disabled")}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{getSourceLabel(provider.source, t)}</Badge>
                    <Badge variant="outline">
                      {provider.client_secret_configured ? t("Secret Configured") : t("No Secret Configured")}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
