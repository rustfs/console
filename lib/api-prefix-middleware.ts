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

// AWS SDK middleware types are generic over per-client Input/Output unions, so
// a structurally-typed wrapper that's compatible with both S3Client and STSClient
// requires `any` here. Narrowing inside the middleware body keeps it safe.
interface MiddlewareClient {
  middlewareStack: {
    addRelativeTo: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mw: any,
      opts: { name: string; relation: "before" | "after"; toMiddleware: string; override?: boolean },
    ) => void
  }
}

type FinalizeArgs = { request?: { path?: string } & Record<string, unknown> }

export function addApiPrefixMiddleware(client: MiddlewareClient): void {
  const apiPrefix = getApiPrefix()
  if (!apiPrefix) return

  client.middlewareStack.addRelativeTo(
    (next: (args: FinalizeArgs) => Promise<unknown>) => async (args: FinalizeArgs) => {
      const request = args?.request
      if (request && typeof request.path === "string" && !request.path.startsWith(apiPrefix)) {
        request.path = apiPrefix + (request.path === "/" ? "/" : request.path)
      }
      return next(args)
    },
    {
      name: "addRustfsApiPrefix",
      relation: "after",
      toMiddleware: "awsAuthMiddleware",
    },
  )
}
