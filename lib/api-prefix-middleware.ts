// Adds NEXT_PUBLIC_API_PREFIX to the request path AFTER SigV4 signing for
// AWS SDK v3 clients (@aws-sdk/client-s3, @aws-sdk/client-sts). The signed
// canonical-request URI stays un-prefixed; the wire request carries the
// prefix so a reverse proxy can route it to the rustfs origin while
// rustfs's signature verification (which sees the un-prefixed path after
// the proxy strips the prefix) still matches.
//
// Used because AWS SDK v3's SigV4 signer has no strip-on-sign hook. For
// our custom AwsClient (lib/aws4fetch.ts) we instead patch the signer
// directly to strip the prefix before computing the canonical string.

const getApiPrefix = (): string => (process.env.NEXT_PUBLIC_API_PREFIX || "").replace(/\/$/, "")

interface MiddlewareClient {
  middlewareStack: {
    addRelativeTo: (
      // biome-ignore lint/suspicious/noExplicitAny: AWS SDK middleware types
      mw: any,
      opts: { name: string; relation: "before" | "after"; toMiddleware: string; override?: boolean },
    ) => void
  }
}

export function addApiPrefixMiddleware(client: MiddlewareClient): void {
  const apiPrefix = getApiPrefix()
  if (!apiPrefix) return

  client.middlewareStack.addRelativeTo(
    // biome-ignore lint/suspicious/noExplicitAny: AWS SDK middleware types are complex
    ((next: any) => async (args: any) => {
      const request = args?.request
      if (request && typeof request.path === "string" && !request.path.startsWith(apiPrefix)) {
        request.path = apiPrefix + (request.path === "/" ? "/" : request.path)
      }
      return next(args)
    }),
    {
      name: "addRustfsApiPrefix",
      relation: "after",
      toMiddleware: "awsAuthMiddleware",
    },
  )
}
