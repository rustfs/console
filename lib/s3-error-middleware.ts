import type { S3Client } from "@aws-sdk/client-s3"
import { getServiceErrorMessage, getXmlErrorCode, getXmlErrorMessage } from "./error-handler"
import { isSessionError } from "./auth-session"

type StreamCollector = (streamBody: unknown) => Promise<Uint8Array>

const readResponseBodyText = async (
  body: unknown,
  streamCollector: StreamCollector | undefined,
): Promise<string | null> => {
  if (typeof body === "string") {
    return body
  }

  if (body instanceof Uint8Array) {
    return new TextDecoder("utf-8").decode(body)
  }

  if (!body || !streamCollector) {
    return null
  }

  const bytes = await streamCollector(body)
  return new TextDecoder("utf-8").decode(bytes)
}

const createS3ServiceError = (message: string, statusCode: number, code?: string | null) => {
  const error = new Error(message) as Error & {
    Code?: string
    $metadata?: { httpStatusCode?: number }
  }
  error.name = code ?? "S3ServiceError"
  if (code) error.Code = code
  error.$metadata = { httpStatusCode: statusCode }
  return error
}

export function addS3ErrorMiddleware(client: S3Client, onSessionExpired: () => void) {
  /* eslint-disable @typescript-eslint/no-explicit-any -- AWS SDK middleware types are complex */
  client.middlewareStack.addRelativeTo(
    ((next: any) => async (args: any) => {
      const result = await next(args)
      const response = result?.response
      const statusCode = response?.statusCode

      if (typeof statusCode === "number" && statusCode >= 300) {
        const streamCollector = client.config.streamCollector as StreamCollector | undefined
        const bodyText = await readResponseBodyText(response.body, streamCollector)
        const errorCode = bodyText ? getXmlErrorCode(bodyText) : null
        const errorMessage = bodyText ? (getXmlErrorMessage(bodyText) ?? bodyText.trim()) : null

        if (errorMessage) {
          throw createS3ServiceError(errorMessage, statusCode, errorCode)
        }
      }

      return result
    }) as any,
    {
      name: "normalizeXmlErrorResponse",
      relation: "after",
      toMiddleware: "deserializerMiddleware",
      override: true,
    },
  )
  client.middlewareStack.addRelativeTo(
    ((next: any) => async (args: any) => {
      try {
        return await next(args)
      } catch (error: unknown) {
        const err = error as {
          $metadata?: { httpStatusCode?: number }
          Code?: string
          name?: string
          message?: string
        }
        if (err?.$metadata?.httpStatusCode === 401 || isSessionError(err?.Code) || isSessionError(err?.name)) {
          onSessionExpired()
          throw error
        }

        const serviceErrorMessage = getServiceErrorMessage(error)
        if (serviceErrorMessage && error instanceof Error) {
          error.message = serviceErrorMessage
        }
        throw error
      }
    }) as any,
    { name: "handleXmlResponse", relation: "before", toMiddleware: "deserializerMiddleware" },
  )
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
