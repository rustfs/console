"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiUserLine, RiLockPasswordLine, RiLogoutBoxRLine, RiMore2Line } from "@remixicon/react"
import { buildRoute } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
import { useUsers } from "@/hooks/use-users"
import { AccessKeysChangePassword } from "@/components/access-keys/change-password"
import { useSidebar } from "@/components/ui/sidebar"

export function UserDropdown() {
  const { t } = useTranslation()
  const router = useRouter()
  const { logout, isAdmin, setIsAdmin } = useAuth()
  const { userInfo } = usePermissions()
  const { isAdminUser } = useUsers()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

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
                  src={buildRoute("/img/rustfs.png")}
                  alt="RustFS"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              </span>
            </div>
            {!isCollapsed && (
              <RiMore2Line className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" side="top">
          <DropdownMenuItem asChild>
            <div className="flex cursor-default items-center gap-2">
              <RiUserLine className="h-4 w-4" />
              {!isAdmin ? (
                <span>
                  {(userInfo as { account_name?: string })?.account_name ?? ""}
                </span>
              ) : (
                <span>rustfsAdmin</span>
              )}
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

      <AccessKeysChangePassword
        visible={changePasswordVisible}
        onVisibleChange={setChangePasswordVisible}
      />
    </>
  )
}
