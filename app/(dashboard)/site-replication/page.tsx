"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { useMessage } from "@/lib/ui/message"

export default function SiteReplicationPage() {
  const { t } = useTranslation()
  const message = useMessage()

  return (
    <Page>
      <PageHeader
        actions={
          <Button
            type="button"
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={() =>
              message.info(t("Add Site form coming soon"))
            }
          >
            <RiAddLine className="size-4" aria-hidden />
            <span>{t("Add Site")}</span>
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">{t("Site Replication")}</h1>
      </PageHeader>

      <div className="flex flex-col gap-4">
        <Card className="min-h-[400px] shadow-none">
          <CardContent className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t("No Data")}
            </p>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
