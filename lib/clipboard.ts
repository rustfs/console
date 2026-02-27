export async function copyToClipboard(value: string): Promise<void> {
  if (!value) throw new Error("No value to copy")

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch (error) {
      // Fallback to legacy copy only when Clipboard API is denied or unsupported in current context
      const fallback = legacyCopyToClipboard(value)
      if (fallback) return
      if (error instanceof Error) throw error
      throw new Error("Failed to copy text")
    }
  }

  const fallback = legacyCopyToClipboard(value)
  if (fallback) return

  throw new Error("Failed to copy text")
}

function legacyCopyToClipboard(value: string): boolean {
  if (typeof document === "undefined" || !document?.execCommand) return false

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.top = "0"
  textarea.style.left = "0"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"
  textarea.style.zIndex = "-1"

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand("copy")
  } catch {
    copied = false
  } finally {
    document.body.removeChild(textarea)
  }

  return copied
}
