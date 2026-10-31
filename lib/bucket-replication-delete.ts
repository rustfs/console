// <DeleteReplication> (permanent-delete replication) is a MinIO/RustFS
// extension of the S3 replication schema. @aws-sdk/client-s3 serializes and
// deserializes ReplicationConfiguration from its own schema, so the element is
// neither written by PutBucketReplication nor read back by
// GetBucketReplication; without the GET side every re-PUT of the fetched
// rules silently disables delete replication. These middlewares patch the
// wire XML in both directions.

export interface DeleteReplicationRule {
  DeleteReplication?: { Status?: string }
}

interface ReplicationOutput {
  ReplicationConfiguration?: { Rules?: DeleteReplicationRule[] }
}

interface HttpResponseLike {
  statusCode?: number
  body?: unknown
}

type Handler = (args: Record<string, unknown>) => Promise<unknown>
type Middleware = (next: Handler, context: { commandName?: string }) => Handler

// AWS SDK middleware types are generic over the client's Input/Output unions;
// the structural `any` here mirrors lib/api-prefix-middleware.ts.
interface MiddlewareClient {
  config: { streamCollector?: (stream: unknown) => Promise<Uint8Array> }
  middlewareStack: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    add(mw: any, opts: { step: "serialize"; name: string; priority: "low" | "normal" | "high" }): void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addRelativeTo(mw: any, opts: { name: string; relation: "before" | "after"; toMiddleware: string }): void
  }
}

const GET_COMMAND = "GetBucketReplicationCommand"
const RULE_PATTERN = /<Rule\b[^>]*>([\s\S]*?)<\/Rule>/g
const STATUS_PATTERN = /<DeleteReplication\b[^>]*>\s*<Status>\s*([^<\s]*)\s*<\/Status>\s*<\/DeleteReplication>/

// PUT side: append the element the SDK dropped to each serialized <Rule>, in
// rule order, so the stored configuration keeps the form's choice.
export function injectDeleteReplication(
  body: string | undefined,
  rules: DeleteReplicationRule[] | undefined,
): string | undefined {
  if (typeof body !== "string" || !rules?.length) return body
  let i = 0
  return body.replace(/<\/Rule>/g, () => {
    const dr = rules[i++]?.DeleteReplication
    const tag = dr ? `<DeleteReplication><Status>${dr.Status ?? "Disabled"}</Status></DeleteReplication>` : ""
    return tag + "</Rule>"
  })
}

// GET side: the status of each <Rule> in document order, `undefined` where the
// rule carries no <DeleteReplication>. The SDK keeps rule order, so the index
// lines up with the parsed Rules array.
export function readDeleteReplicationStatuses(xml: string): Array<string | undefined> {
  return Array.from(xml.matchAll(RULE_PATTERN), ([, rule]) => STATUS_PATTERN.exec(rule ?? "")?.[1] || undefined)
}

export function applyDeleteReplicationStatuses(
  rules: DeleteReplicationRule[] | undefined,
  statuses: Array<string | undefined>,
): void {
  rules?.forEach((rule, index) => {
    const status = statuses[index]
    if (status) rule.DeleteReplication = { Status: status }
  })
}

function bufferedXml(body: unknown): string | null {
  if (typeof body === "string") return body
  if (body instanceof Uint8Array) return new TextDecoder().decode(body)
  return null
}

// The S3 client's own throw200Exceptions middleware sits between the two GET
// middlewares below and re-wraps the body it inspected as a fresh stream, so
// the merge step cannot re-read `response.body`; hand the XML over per request.
const xmlByRequest = new WeakMap<object, string>()

function requestKey(args: Record<string, unknown>): object {
  const request = args.request
  return typeof request === "object" && request !== null ? request : args
}

export function addDeleteReplicationMiddleware(client: MiddlewareClient): void {
  const injectOnPut: Middleware = (next) => async (args) => {
    const input = args?.input as { ReplicationConfiguration?: { Rules?: DeleteReplicationRule[] } } | undefined
    const request = args?.request as { body?: unknown } | undefined
    if (input && "ReplicationConfiguration" in input && "Bucket" in input && request) {
      const raw =
        typeof request.body === "string"
          ? request.body
          : request.body instanceof Uint8Array
            ? new TextDecoder().decode(request.body)
            : undefined
      const patched = injectDeleteReplication(raw, input.ReplicationConfiguration?.Rules)
      if (patched != null) request.body = patched
    }
    return next(args)
  }

  // Sits between the deserializer and the HTTP handler: the deserializer
  // consumes a streamed body, so buffer it once and keep the text for the
  // merge step.
  const bufferOnGet: Middleware = (next, context) => async (args) => {
    const result = (await next(args)) as { response?: HttpResponseLike } | undefined
    const response = result?.response
    const streamCollector = client.config.streamCollector
    if (
      context.commandName !== GET_COMMAND ||
      !streamCollector ||
      typeof response?.statusCode !== "number" ||
      response.statusCode >= 300
    ) {
      return result
    }
    let xml = bufferedXml(response.body)
    if (xml === null) {
      const bytes = await streamCollector(response.body)
      response.body = bytes
      xml = new TextDecoder().decode(bytes)
    }
    xmlByRequest.set(requestKey(args), xml)
    return result
  }

  // Wraps the deserializer: copy the statuses it dropped onto the parsed rules.
  const mergeOnGet: Middleware = (next, context) => async (args) => {
    const result = (await next(args)) as { output?: ReplicationOutput } | undefined
    if (context.commandName !== GET_COMMAND) return result
    const key = requestKey(args)
    const xml = xmlByRequest.get(key)
    xmlByRequest.delete(key)
    if (xml) {
      applyDeleteReplicationStatuses(
        result?.output?.ReplicationConfiguration?.Rules,
        readDeleteReplicationStatuses(xml),
      )
    }
    return result
  }

  client.middlewareStack.add(injectOnPut, { step: "serialize", name: "injectDeleteReplication", priority: "low" })
  client.middlewareStack.addRelativeTo(bufferOnGet, {
    name: "bufferDeleteReplicationXml",
    relation: "after",
    toMiddleware: "deserializerMiddleware",
  })
  client.middlewareStack.addRelativeTo(mergeOnGet, {
    name: "mergeDeleteReplication",
    relation: "before",
    toMiddleware: "deserializerMiddleware",
  })
}
