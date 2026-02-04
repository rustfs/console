"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { configManager } from "@/lib/config"
import { useMessage } from "@/lib/feedback/message"

interface CurrentConfig {
  serverHost: string
  api: { baseURL: string }
  s3: { endpoint: string; region: string }
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const message = useMessage()

  const [currentConfig, setCurrentConfig] = useState<CurrentConfig>({
    serverHost: "",
    api: { baseURL: "" },
    s3: { endpoint: "", region: "" },
  })
  const [formData, setFormData] = useState({ serverHost: "" })
  const [loading, setLoading] = useState(false)

  const loadCurrentConfig = useCallback(async () => {
    try {
      const config = await configManager.loadConfig()
      setCurrentConfig({
        serverHost: config.serverHost,
        api: { baseURL: config.api.baseURL },
        s3: {
          endpoint: config.s3.endpoint ?? "",
          region: config.s3.region ?? "",
        },
      })
      setFormData({ serverHost: config.serverHost })
    } catch {
      message.error(t("Failed to load current configuration"))
    }
  }, [message, t])

  useEffect(() => {
    loadCurrentConfig()
  }, [loadCurrentConfig])

  const currentItems = useMemo(
    () => [
      {
        label: t("Server Host"),
        value: currentConfig.serverHost || t("Not configured"),
      },
      {
        label: t("API Base URL"),
        value: currentConfig.api.baseURL || t("Not configured"),
      },
      {
        label: t("S3 Endpoint"),
        value: currentConfig.s3.endpoint || t("Not configured"),
      },
      {
        label: t("S3 Region"),
        value: currentConfig.s3.region || t("Not configured"),
      },
    ],
    [currentConfig, t],
  )

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.serverHost) {
      message.error(t("Please enter server address"))
      return
    }

    setLoading(true)
    try {
      let urlToValidate = formData.serverHost.trim()
      if (!/^https?:\/\//.test(urlToValidate)) {
        urlToValidate = "https://" + urlToValidate
      }

      new URL(urlToValidate)
      const urlToSave = /^https?:\/\//.test(formData.serverHost) ? formData.serverHost : urlToValidate

      localStorage.setItem("rustfs-server-host", urlToSave)

      if (!/^https?:\/\//.test(formData.serverHost)) {
        setFormData({ serverHost: urlToValidate })
      }

      configManager.clearCache()
      message.success(t("Configuration saved successfully"))

      setTimeout(() => {
        window.location.reload()
      }, 200)
    } catch {
      message.error(t("Invalid server address format"))
    } finally {
      setLoading(false)
    }
  }

  const resetConfig = () => {
    localStorage.removeItem("rustfs-server-host")
    configManager.clearCache()
    message.success(t("Configuration reset successfully"))
    setTimeout(() => {
      window.location.reload()
    }, 200)
  }

  return (
    <Page>
      <PageHeader>
        <h1 className="text-2xl font-bold">{t("Settings")}</h1>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("Current Configuration")}</h2>
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {currentItems.map((item) => (
              <div key={item.label} className="rounded-md border p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-sm">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("Server Configuration")}</h2>
          <form className="space-y-4" onSubmit={saveConfig}>
            <Field>
              <FieldLabel>{t("Server Address")}</FieldLabel>
              <FieldContent>
                <Input
                  value={formData.serverHost}
                  onChange={(e) => setFormData({ serverHost: e.target.value })}
                  placeholder={t("Please enter server address (e.g., http://localhost:9000)")}
                  autoComplete="off"
                />
              </FieldContent>
              <FieldDescription>{t("Example: http://localhost:9000 or https://your-domain.com")}</FieldDescription>
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="default" disabled={loading}>
                {t("Save Configuration")}
              </Button>
              <Button type="button" variant="outline" onClick={resetConfig}>
                {t("Reset to Default")}
              </Button>
            </div>
          </form>

          <Alert>
            <AlertTitle>{t("Configuration Information")}</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>{t("Configuration is saved locally in your browser")}</li>
                <li>{t("Page will refresh automatically after saving configuration")}</li>
                <li>{t("Make sure the server address is accessible from your network")}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Page>
  )
}
