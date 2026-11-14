/** Keep an installation's reverse-proxy prefix when selecting the v4 permissions route. */
export function permissionEndpoint(apiBase: string): string {
  const url = new URL(apiBase)
  const base = url.pathname.replace(/\/$/, "")
  url.pathname = base.endsWith("/rustfs/admin/v3")
    ? `${base.slice(0, -3)}/v4/account/permissions`
    : "/rustfs/admin/v4/account/permissions"
  url.search = ""
  url.hash = ""
  return url.toString()
}
