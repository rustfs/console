import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { AppUiProvider } from "@/components/providers/app-ui-provider"
import { getThemeManifest } from "@/lib/theme/manifest"

const theme = getThemeManifest()

export const metadata: Metadata = {
  title: theme.brand.name,
  description: theme.brand.description ?? "RustFS is a distributed file system written in Rust.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background font-sans antialiased overscroll-none">
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <AppUiProvider>{children}</AppUiProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
