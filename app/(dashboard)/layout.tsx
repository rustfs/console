import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopNav } from "@/components/app-top-nav"
import { DashboardAuthGuard } from "@/components/dashboard-auth-guard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <SidebarProvider defaultOpen>
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
