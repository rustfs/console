/** Matches the server's Secret Key length validation without changing the value. */
export function isSecretKeyValid(secretKey: string): boolean {
  return new TextEncoder().encode(secretKey).length >= 8
}
