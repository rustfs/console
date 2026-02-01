"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  RiUploadFill,
  RiCustomerService2Line,
} from "@remixicon/react"
import dayjs from "dayjs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { LicenseArticle } from "@/components/license/article"
import type { ColumnDef } from "@tanstack/react-table"

const hasLicense = false
const hasValidLicense = false
const endDate = dayjs().format("YYYY-MM-DD")

interface PermissionItem {
  name: string
  description: string
  status: string
}

function LicenseWithEnterprise() {
  const { t } = useTranslation()

  const licenseKey = "RUSTFS-ENTERPRISE-127-183"

  const licenseDetails = useMemo(
    () => [
      { label: t("Licensed Company"), value: t("No License") },
      { label: t("License Key"), value: licenseKey },
      { label: t("Licensed Users"), value: t("Unlimited") },
      {
        label: t("Support Level"),
        value: `${t("Enterprise")} (7x24x365)`,
      },
    ],
    [t]
  )

  const serviceInfo = useMemo(
    () => [
      { label: t("Service Hotline"), value: "400-033-5363" },
      { label: t("Version"), value: "v2.3" },
      { label: t("Service Email"), value: "hello@rustfs.com" },
      {
        label: t("Enterprise Service Level"),
        value: t("Platinum Service"),
      },
      {
        label: t("On-site Technical Service"),
        value: t("Supported"),
      },
      {
        label: t("Remote Technical Support"),
        value: t("Supported"),
      },
      { label: t("Technical Training"), value: t("Supported") },
      { label: t("On-site Deployment"), value: t("Supported") },
      { label: t("Emergency Response"), value: t("Supported") },
      {
        label: t("Response Level"),
        value: t("One-hour Response"),
      },
    ],
    [t]
  )

  const permissions = useMemo<PermissionItem[]>(
    () => [
      {
        name: t("Single Machine Multiple Disks"),
        description: t(
          "Supports managing multiple storage disks on a single server to improve storage resource utilization and simplify management and maintenance"
        ),
        status: t("Enabled"),
      },
      {
        name: t("Advanced Monitoring"),
        description: t(
          "Provides detailed performance monitoring and alerting mechanisms to help administrators understand system status in real-time and ensure system stability and reliability"
        ),
        status: t("Enabled"),
      },
      {
        name: t("Metrics"),
        description: t(
          "Collects and displays key performance indicators (such as CPU, memory, disk I/O, etc.) through visualized charts to help users understand system operation status and performance bottlenecks"
        ),
        status: t("Enabled"),
      },
    ],
    [t]
  )

  const permissionsColumns: ColumnDef<PermissionItem>[] = useMemo(
    () => [
      {
        id: "name",
        header: () => t("Name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "description",
        header: () => t("Description"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.description}
          </span>
        ),
      },
      {
        id: "status",
        header: () => t("Status"),
        cell: ({ row }) => (
          <Badge variant="default">{row.original.status}</Badge>
        ),
      },
    ],
    [t]
  )

  const { table: permissionsTable } = useDataTable<PermissionItem>({
    data: permissions,
    columns: permissionsColumns,
    getRowId: (row) => row.name,
  })

  const technicalParameters = useMemo(
    () => [
      { label: t("Service Hotline"), value: "400-033-5363" },
      {
        label: t("Supported OS"),
        value: "Windows、Linux、MacOS",
      },
      {
        label: t("Supported CPU Architecture"),
        value: "Amd64、ARM、AMR64、MIPS64、S390X、PPC64LE",
      },
      {
        label: t("Virtualization Platform Support"),
        value: "KVM、VMware、Hyper-V、Docker、Kubernetes",
      },
      {
        label: t("Development Language Requirements"),
        value: "C++、Java、Rust、Go、Python、Node.js",
      },
      { label: t("SNND Mode"), value: t("Supported") },
      { label: t("SNMD Mode"), value: t("Supported") },
      { label: t("MNMD Mode"), value: t("Supported") },
      { label: t("Bucket Count"), value: t("Unlimited") },
      { label: t("Object Count"), value: t("Unlimited") },
      {
        label: t("EC Mode"),
        value: t("Reed-Solomon Matrix"),
      },
      { label: t("Access Control"), value: "IAM Policy" },
      {
        label: t("Secure Transport"),
        value: t("Supports HTTPS, TLS"),
      },
      {
        label: t("Bucket Policy"),
        value: t("Public, Private, Custom"),
      },
      { label: t("Single Object"), value: t("Max 50TB") },
      {
        label: t("Data Redundancy"),
        value: t("Supports Erasure Coding"),
      },
      { label: t("Data Backup"), value: t("Supported") },
      { label: t("Scalability"), value: t("Supported") },
      {
        label: t("Read/Write Performance"),
        value: t("Supports high concurrency operations"),
      },
      {
        label: t("Identity Authentication Expansion"),
        value: "OpenID、LDAP",
      },
      { label: t("S3 Compatibility"), value: t("Supported") },
      {
        label: t("SDK Support"),
        value: "Java、Python、Go、Rust、Node.js",
      },
      { label: t("Bucket Notification"), value: t("Supported") },
      { label: t("RustyVault Encryption"), value: t("Supported") },
      { label: t("HashiCorp Encryption"), value: t("Supported") },
      { label: t("Lifecycle Management"), value: t("Supported") },
      { label: t("s3fs"), value: t("Supported") },
      { label: t("Prometheus"), value: t("Supported") },
      { label: t("Bucket Quota"), value: t("Supported") },
      { label: t("Audit"), value: t("Supported") },
      { label: t("Logs"), value: t("Supported") },
      { label: t("Object Repair"), value: t("Supported") },
      { label: t("WORM"), value: t("Supported") },
      { label: t("Remote Tiering"), value: t("Supported") },
      { label: t("Tiering Transfer"), value: t("Supported") },
      { label: t("Object Sharing"), value: t("Supported") },
      { label: t("Load Balancing"), value: t("Supported") },
      { label: t("Object Tags"), value: t("Supported") },
      { label: t("Multipart Upload"), value: t("Supported") },
      { label: t("Key Creation"), value: t("Supported") },
      { label: t("Key Expiration"), value: t("Supported") },
      {
        label: t("Disk Bad Spot Check"),
        value: t("Supported"),
      },
      { label: t("Bitrot"), value: t("Supported") },
      { label: t("Version Control"), value: t("Supported") },
    ],
    [t]
  )

  const contactSupport = () => {
    window.open(
      "https://ww18.53kf.com/webCompany.php?arg=11003151&kf_sign=DA4MDMTc0Ng4MjE1MjEzODAyNDkyMDAyNzMwMDMxNTE%253D&style=2",
      "_blank"
    )
  }

  const updateLicense = () => {
    // Placeholder logic
  }

  return (
    <>
      <PageHeader>
        <h1 className="text-2xl font-bold">{t("Enterprise License")}</h1>
      </PageHeader>

      <div className="space-y-6">
        <Card className="shadow-none">
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={hasValidLicense ? "default" : "destructive"}
                  >
                    {t("Enterprise License")}
                  </Badge>
                  <span
                    className={
                      hasValidLicense
                        ? "text-sm font-medium text-emerald-600"
                        : "text-sm font-medium text-rose-500"
                    }
                  >
                    {t("Status")}：
                    {hasValidLicense ? t("Normal") : t("Expired")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("License Valid Until")}：{endDate}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default" onClick={updateLicense}>
                  <RiUploadFill className="mr-2 size-4" aria-hidden />
                  {t("Update License")}
                </Button>
                <Button variant="outline" onClick={contactSupport}>
                  <RiCustomerService2Line
                    className="mr-2 size-4"
                    aria-hidden
                  />
                  {t("Contact Support")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardContent className="space-y-4">
              <p className="text-base font-semibold">
                {t("License Details")}
              </p>
              <dl className="grid gap-4 sm:grid-cols-2">
                {licenseDetails.map((item) => (
                  <div
                    key={item.label}
                    className="space-y-1"
                  >
                    <dt className="text-xs font-medium uppercase text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="text-sm text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="space-y-4">
              <p className="text-base font-semibold">
                {t("Customer Service")}
              </p>
              <dl className="grid gap-4 sm:grid-cols-2">
                {serviceInfo.map((item) => (
                  <div
                    key={item.label}
                    className="space-y-1"
                  >
                    <dt className="text-xs font-medium uppercase text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="text-sm text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none">
          <CardContent className="space-y-4">
            <p className="text-base font-semibold">
              {t("Feature Permissions")}
            </p>
            <DataTable table={permissionsTable} />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="space-y-4">
            <p className="text-base font-semibold">
              {t("Technical Parameters")}
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {technicalParameters.map((item) => (
                <div key={item.label} className="space-y-1">
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function LicensePage() {
  if (hasLicense) {
    return (
      <Page>
        <LicenseWithEnterprise />
      </Page>
    )
  }

  return <LicenseArticle />
}
