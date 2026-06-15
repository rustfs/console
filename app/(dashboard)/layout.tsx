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
          <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-0 sm:px-6">
            <AppTopNav />
            <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 scroll-mt-16">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardAuthGuard>
  )
}
