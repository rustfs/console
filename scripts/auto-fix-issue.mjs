import process from "node:process"
import { writeFile } from "node:fs/promises"

const anthropicToken = process.env.ANTHROPIC_AUTH_TOKEN
const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"

const defaultHaikuModel = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "claude-haiku-4.5"
const defaultOpusModel = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || "claude-opus-4.6"
const defaultSonnetModel = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || "claude-sonnet-4.6"

// Priority: explicit model override -> sonnet default -> haiku -> opus.
const anthropicModel = process.env.ANTHROPIC_MODEL || defaultSonnetModel || defaultHaikuModel || defaultOpusModel

const timeoutMs = Number(process.env.ANTHROPIC_TIMEOUT_MS || "180000")
const maxRetries = Number(process.env.ANTHROPIC_MAX_RETRIES || "3")
const retryBaseMs = Number(process.env.ANTHROPIC_RETRY_BASE_MS || "2000")
const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS || "2048")

const issueNumber = process.env.ISSUE_NUMBER || ""
const issueTitle = process.env.ISSUE_TITLE || ""
const issueBody = process.env.ISSUE_BODY || ""
const issueUrl = process.env.ISSUE_URL || ""
const repo = process.env.REPOSITORY || ""

if (!anthropicToken) {
  console.error("Missing ANTHROPIC_AUTH_TOKEN.")
  process.exit(1)
}

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error(`Invalid ANTHROPIC_TIMEOUT_MS: ${process.env.ANTHROPIC_TIMEOUT_MS}`)
  process.exit(1)
}

if (!Number.isFinite(maxRetries) || maxRetries < 1) {
  console.error(`Invalid ANTHROPIC_MAX_RETRIES: ${process.env.ANTHROPIC_MAX_RETRIES}`)
  process.exit(1)
}

if (!Number.isFinite(retryBaseMs) || retryBaseMs < 0) {
  console.error(`Invalid ANTHROPIC_RETRY_BASE_MS: ${process.env.ANTHROPIC_RETRY_BASE_MS}`)
  process.exit(1)
}

if (!Number.isFinite(maxTokens) || maxTokens < 1) {
  console.error(`Invalid ANTHROPIC_MAX_TOKENS: ${process.env.ANTHROPIC_MAX_TOKENS}`)
  process.exit(1)
}

const prompt = [
  "You are a senior software engineer fixing a GitHub issue.",
  "Return ONLY strict JSON with keys: summary, patch.",
  "patch must be a valid unified diff from repository root.",
  "Do not include markdown fences.",
  "Prefer minimal, safe changes and preserve existing conventions.",
  "",
  `Repository: ${repo}`,
  `Issue #${issueNumber}: ${issueTitle}`,
  `Issue URL: ${issueUrl}`,
  "Issue body:",
  issueBody || "(empty)",
].join("\n")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetry(status) {
  return status === 408 || status === 429 || status >= 500
}

function tryParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractLastJsonObject(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")

  const direct = tryParseJson(cleaned)
  if (direct && typeof direct === "object") {
    return direct
  }

  let start = -1
  let depth = 0
  let inString = false
  let escaping = false
  const candidates = []

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i]

    if (escaping) {
      escaping = false
      continue
    }

    if (ch === "\\") {
      escaping = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === "{") {
      if (depth === 0) start = i
      depth += 1
      continue
    }

    if (ch === "}") {
      if (depth === 0) continue
      depth -= 1
      if (depth === 0 && start >= 0) {
        candidates.push(cleaned.slice(start, i + 1))
        start = -1
      }
    }
  }

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const parsed = tryParseJson(candidates[i])
    if (parsed && typeof parsed === "object" && typeof parsed.patch === "string") {
      return parsed
    }
  }

  return null
}

async function requestClaude() {
  const endpoint = `${anthropicBaseUrl.replace(/\/$/, "")}/v1/messages`

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicToken,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      })

      const rawText = await response.text()

      if (!response.ok) {
        if (attempt < maxRetries && shouldRetry(response.status)) {
          const delay = retryBaseMs * 2 ** (attempt - 1)
          console.warn(`Anthropic returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
          await sleep(delay)
          continue
        }

        console.error(`Anthropic API error: ${response.status} ${rawText}`)
        process.exit(1)
      }

      try {
        return JSON.parse(rawText)
      } catch {
        console.error("Anthropic API returned non-JSON response")
        console.error(rawText)
        process.exit(1)
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError"
      if (attempt < maxRetries) {
        const delay = retryBaseMs * 2 ** (attempt - 1)
        console.warn(
          `${isAbort ? "Request timed out" : "Request failed"}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
        )
        await sleep(delay)
        continue
      }

      console.error(isAbort ? `Anthropic request timeout after ${timeoutMs}ms` : `Anthropic request failed: ${String(error)}`)
      process.exit(1)
    } finally {
      clearTimeout(timer)
    }
  }

  console.error("Anthropic request exhausted retries")
  process.exit(1)
}

const data = await requestClaude()
const outputText = Array.isArray(data?.content)
  ? data.content
      .filter((part) => part?.type === "text" && typeof part?.text === "string")
      .map((part) => part.text)
      .join("\n")
  : ""

if (!outputText) {
  console.error("Model returned empty content")
  process.exit(1)
}

const parsed = extractLastJsonObject(outputText)
if (!parsed) {
  console.error("Model output is not valid JSON")
  console.error(outputText)
  process.exit(1)
}

if (!parsed.patch || typeof parsed.patch !== "string") {
  console.error("Model output missing patch")
  process.exit(1)
}

await writeFile("/tmp/issue-autofix.patch", parsed.patch)
await writeFile("/tmp/issue-autofix-summary.txt", String(parsed.summary || ""))
console.log(`Generated patch at /tmp/issue-autofix.patch using model ${anthropicModel}`)
