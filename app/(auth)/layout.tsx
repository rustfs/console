export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh min-w-0">
      {children}
    </main>
  )
}
