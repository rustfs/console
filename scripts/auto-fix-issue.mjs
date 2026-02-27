import process from "node:process"
import { writeFile } from "node:fs/promises"

const anthropicToken = process.env.ANTHROPIC_AUTH_TOKEN
const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"
const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-opus-4.1"
const issueNumber = process.env.ISSUE_NUMBER || ""
const issueTitle = process.env.ISSUE_TITLE || ""
const issueBody = process.env.ISSUE_BODY || ""
const issueUrl = process.env.ISSUE_URL || ""
const repo = process.env.REPOSITORY || ""

if (!anthropicToken) {
  console.error("Missing ANTHROPIC_AUTH_TOKEN.")
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

const response = await fetch(`${anthropicBaseUrl.replace(/\/$/, "")}/v1/messages`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": anthropicToken,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: anthropicModel,
    max_tokens: 4096,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  }),
})

if (!response.ok) {
  const errText = await response.text()
  console.error(`Anthropic API error: ${response.status} ${errText}`)
  process.exit(1)
}

const data = await response.json()
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

const normalized = outputText
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/, "")

let parsed
try {
  parsed = JSON.parse(normalized)
} catch {
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
console.log("Generated patch at /tmp/issue-autofix.patch")
