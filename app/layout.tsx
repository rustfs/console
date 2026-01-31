import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ApiProvider } from "@/contexts/api-context"
import { S3Provider } from "@/contexts/s3-context"
import { PermissionsProvider } from "@/hooks/use-permissions"
import { AppUiProvider } from "@/components/providers/app-ui-provider"

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RustFS",
  description:
    "RustFS is a distributed file system written in Rust.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background font-sans antialiased overscroll-none`}
      >
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <ApiProvider>
                <S3Provider>
                  <PermissionsProvider>
                    <AppUiProvider>{children}</AppUiProvider>
                  </PermissionsProvider>
                </S3Provider>
              </ApiProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
