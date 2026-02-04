import { cookies } from "next/headers"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopNav } from "@/components/app-top-nav"
import { DashboardAuthGuard } from "@/components/dashboard-auth-guard"

const SIDEBAR_COOKIE_NAME = "sidebar_state"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value
  const defaultOpen = sidebarState !== "false"

  return (
    <DashboardAuthGuard>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-6 pt-0">
            <AppTopNav />
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardAuthGuard>
  )
}
