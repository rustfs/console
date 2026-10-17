import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { AppUiProvider } from "@/components/providers/app-ui-provider"
import { getThemeManifest } from "@/lib/theme/manifest"

const archivo = localFont({
  src: "../assets/fonts/archivo-variable.ttf",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
})
const geist = localFont({
  src: "../assets/fonts/geist-variable.ttf",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
})
const geistMono = localFont({
  src: "../assets/fonts/geist-mono-variable.ttf",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
})

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
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="console-ui bg-background font-sans antialiased overscroll-none">
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
