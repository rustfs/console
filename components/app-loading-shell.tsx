"use client"

export function AppLoadingShell() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-muted p-4 sm:p-6 lg:p-20">
      <div className="z-10 mx-auto flex w-full max-w-7xl flex-col overflow-hidden border bg-card shadow-none lg:min-h-[560px] lg:flex-row">
        <div className="hidden w-1/2 border-e bg-muted/40 p-16 lg:flex lg:flex-col lg:justify-center">
          <div className="h-6 w-28 animate-pulse bg-muted-foreground/20" />
          <div className="mt-8 space-y-3">
            <div className="h-10 w-72 max-w-full animate-pulse bg-muted-foreground/20" />
            <div className="h-10 w-56 max-w-full animate-pulse bg-muted-foreground/20" />
            <div className="h-5 w-64 max-w-full animate-pulse bg-muted-foreground/15" />
          </div>
        </div>
        <div className="flex w-full flex-col items-center justify-center bg-card lg:w-1/2">
          <div className="w-full max-w-sm space-y-6 p-4 sm:p-7">
            <div className="h-6 w-28 animate-pulse bg-muted-foreground/20" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 animate-pulse bg-muted" />
              <div className="h-10 animate-pulse bg-muted" />
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-4 w-20 animate-pulse bg-muted-foreground/15" />
                <div className="h-10 animate-pulse bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 animate-pulse bg-muted-foreground/15" />
                <div className="h-10 animate-pulse bg-muted" />
              </div>
              <div className="h-10 animate-pulse bg-primary/25" />
            </div>
            <div className="flex justify-center gap-4">
              <div className="size-8 animate-pulse bg-muted" />
              <div className="size-8 animate-pulse bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
