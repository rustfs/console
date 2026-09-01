"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"
import { RiLogoutBoxRLine, RiMore2Line, RiShieldKeyholeLine, RiUserSettingsLine } from "@remixicon/react"
import { buildRoute, getLoginRoute } from "@/lib/routes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
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
  const { logoutWithOidcRedirect, isAdmin } = useAuth()
  const { userInfo } = usePermissions()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const theme = getThemeManifest()
  const baseAvatarPath = theme.assets.userAvatar ?? "/img/userAvatar.png"
  const preferredAvatarPath = resolvedTheme === "dark" ? withDarkVariant(baseAvatarPath) : baseAvatarPath
  const [avatar, setAvatar] = useState(() => resolveAvatarPath(preferredAvatarPath))

  useEffect(() => {
    setAvatar(resolveAvatarPath(preferredAvatarPath))
  }, [preferredAvatarPath])

  const handleLogout = async () => {
    const redirected = await logoutWithOidcRedirect()
    if (!redirected) {
      router.push(getLoginRoute())
    }
  }

  const accountName = (userInfo as { account_name?: string })?.account_name ?? ""
  const roleLabel = isAdmin ? t("Administrator") : t("User")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size={isCollapsed ? "icon" : "default"} aria-label={t("User menu")}>
            <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
              <Image
                src={avatar}
                alt=""
                width={24}
                height={24}
                className="size-6 rounded-full object-cover"
                onError={() => {
                  const fallback = resolveAvatarPath(baseAvatarPath)
                  setAvatar((current) => (current === fallback ? current : fallback))
                }}
              />
            </span>
            {!isCollapsed && (
              <>
                {/* The name belongs on the trigger too: the menu should confirm
                    the identity, not be the only place to discover it. */}
                <span className="hidden min-w-0 max-w-32 truncate text-sm md:inline">{accountName}</span>
                <RiMore2Line className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="end" side="top">
        <DropdownMenuGroup>
          {/* Identity first: who am I, and with what authority. A menu that opens
              on an avatar with no name leaves both unanswered. */}
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate font-medium" title={accountName || undefined}>
              {accountName || t("Unknown user")}
            </span>
            <span className="block text-xs text-muted-foreground">{roleLabel}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <Link href={buildRoute("/account")} className="flex w-full items-center gap-2">
                <RiUserSettingsLine className="size-4" aria-hidden />
                <span>{t("Profile")}</span>
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link href={buildRoute("/account/security")} className="flex w-full items-center gap-2">
                <RiShieldKeyholeLine className="size-4" aria-hidden />
                <span>{t("Security")}</span>
              </Link>
            }
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleLogout}>
            <RiLogoutBoxRLine className="size-4" aria-hidden />
            <span>{t("Logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
