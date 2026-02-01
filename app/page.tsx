import { redirect } from "next/navigation"

export default function RootPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/rustfs/console"
  redirect(basePath)
}
