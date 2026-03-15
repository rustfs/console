"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiUserLine, RiLockPasswordLine, RiLogoutBoxRLine, RiMore2Line } from "@remixicon/react"
import { buildRoute } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
import { useUsers } from "@/hooks/use-users"
import { ChangePassword } from "./change-password"
import { useSidebar } from "@/components/ui/sidebar"
import { getThemeManifest } from "@/lib/theme/manifest"

export function UserDropdown() {
  const { t } = useTranslation()
  const router = useRouter()
  const { logout, isAdmin, setIsAdmin } = useAuth()
  const { userInfo } = usePermissions()
  const { isAdminUser } = useUsers()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const theme = getThemeManifest()
  const defaultAvatar = buildRoute("/img/rustfs.png")
  const userAvatar = theme.assets?.userAvatar
  const avatar =
    userAvatar != null && userAvatar !== ""
      ? userAvatar.startsWith("/") && !userAvatar.startsWith("//")
        ? buildRoute(userAvatar)
        : userAvatar
      : defaultAvatar

  const [changePasswordVisible, setChangePasswordVisible] = useState(false)

  useEffect(() => {
    isAdminUser().then((adminInfo) => {
      if (adminInfo) {
        setIsAdmin(adminInfo.is_admin ?? false)
      }
    })
  }, [isAdminUser, setIsAdmin])

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
              <span>{(userInfo as { account_name?: string })?.account_name ?? (isAdmin ? "rustfsAdmin" : "")}</span>
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
