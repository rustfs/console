"use client"

import {
  RiBox3Line,
  RiDoorLockLine,
  RiShieldCheckLine,
  RiFileUserLine,
  RiGroupLine,
  RiDownload2Line,
  RiBarChartBoxLine,
  RiStackLine,
  RiBookmark3Line,
  RiSecurePaymentLine,
  RiCopyrightLine,
  RiFileList3Line,
  RiBroadcastLine,
  RiFileCopyLine,
  RiExchange2Line,
  RiUploadCloud2Line,
} from "@remixicon/react"
import type { ComponentType } from "react"

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  "ri:box-3-line": RiBox3Line,
  "ri:door-lock-line": RiDoorLockLine,
  "ri:shield-check-line": RiShieldCheckLine,
  "ri:file-user-line": RiFileUserLine,
  "ri:group-line": RiGroupLine,
  "ri:download-2-line": RiDownload2Line,
  "ri:bar-chart-box-line": RiBarChartBoxLine,
  "ri:stack-line": RiStackLine,
  "ri:bookmark-3-line": RiBookmark3Line,
  "ri:secure-payment-line": RiSecurePaymentLine,
  "ri:copyright-line": RiCopyrightLine,
  "ri:file-list-3-line": RiFileList3Line,
  "ri:broadcast-line": RiBroadcastLine,
  "ri:file-copy-line": RiFileCopyLine,
  "ri:exchange-2-line": RiExchange2Line,
  "ri:upload-cloud-2-line": RiUploadCloud2Line,
}

export function getIconComponent(name?: string): ComponentType<{ className?: string }> | null {
  if (!name) return null
  return iconMap[name] ?? null
}
