import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopNav } from "@/components/app-top-nav"
import { DashboardAuthGuard } from "@/components/dashboard-auth-guard"
import { ApiProvider } from "@/contexts/api-context"
import { S3Provider } from "@/contexts/s3-context"
import { TaskProvider } from "@/contexts/task-context"
import { PermissionsProvider } from "@/hooks/use-permissions"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider>
      <S3Provider>
        <TaskProvider>
          <PermissionsProvider>
            <DashboardAuthGuard>
              <SidebarProvider defaultOpen style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
                <AppSidebar />
                <SidebarInset className="min-w-0 bg-muted/20">
                  <div className="flex flex-1 flex-col">
                    <AppTopNav />
                    <main
                      id="main-content"
                      tabIndex={-1}
                      className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 scroll-mt-24 px-4 py-6 sm:px-8 sm:py-8 xl:px-10"
                    >
                      {children}
                    </main>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </DashboardAuthGuard>
          </PermissionsProvider>
        </TaskProvider>
      </S3Provider>
    </ApiProvider>
  )
}
