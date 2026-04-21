"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"
import { RiUserLine, RiLockPasswordLine, RiLogoutBoxRLine, RiMore2Line } from "@remixicon/react"
import { buildRoute } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
import { ChangePassword } from "./change-password"
import { useSidebar } from "@/components/ui/sidebar"
import { getThemeManifest } from "@/lib/theme/manifest"

function resolveAvatarPath(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path
  return buildRoute(path)
}

function withDarkVariant(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path

  const [pathname, suffix = ""] = path.split(/(?=[?#])/)
  const lastSlashIndex = pathname.lastIndexOf("/")
  const fileName = lastSlashIndex >= 0 ? pathname.slice(lastSlashIndex + 1) : pathname
  const dirName = lastSlashIndex >= 0 ? pathname.slice(0, lastSlashIndex + 1) : ""
  const dotIndex = fileName.lastIndexOf(".")
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : ""

  if (baseName.endsWith("-dark")) return path

  return `${dirName}${baseName}-dark${ext}${suffix}`
}

export function UserDropdown() {
  const { t } = useTranslation()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { logout, isAdmin } = useAuth()
  const { userInfo } = usePermissions()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const theme = getThemeManifest()
  const baseAvatarPath = theme.assets.userAvatar ?? "/img/userAvatar.png"
  const preferredAvatarPath = resolvedTheme === "dark" ? withDarkVariant(baseAvatarPath) : baseAvatarPath
  const [avatar, setAvatar] = useState(() => resolveAvatarPath(preferredAvatarPath))

  const [changePasswordVisible, setChangePasswordVisible] = useState(false)

  useEffect(() => {
    setAvatar(resolveAvatarPath(preferredAvatarPath))
  }, [preferredAvatarPath])

  const handleChangePassword = () => {
    setChangePasswordVisible(true)
  }

  const handleLogout = async () => {
    await logout()
    router.push("/auth/login")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-muted">
                <Image
                  src={avatar}
                  alt={theme.brand.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={() => {
                    const fallback = resolveAvatarPath(baseAvatarPath)
                    setAvatar((current) => (current === fallback ? current : fallback))
                  }}
                />
              </span>
            </div>
            {!isCollapsed && <RiMore2Line className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" side="top">
          <DropdownMenuItem asChild>
            <div className="flex cursor-default items-center gap-2">
              <RiUserLine className="h-4 w-4" />
              <span>{(userInfo as { account_name?: string })?.account_name ?? ""}</span>
            </div>
          </DropdownMenuItem>
          {!isAdmin && (
            <DropdownMenuItem onSelect={handleChangePassword}>
              <RiLockPasswordLine className="h-4 w-4" />
              <span>{t("Change Password")}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleLogout}>
            <RiLogoutBoxRLine className="h-4 w-4" />
            <span>{t("Logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePassword visible={changePasswordVisible} onVisibleChange={setChangePasswordVisible} />
    </>
  )
}
