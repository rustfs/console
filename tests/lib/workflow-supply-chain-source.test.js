import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const WORKFLOWS_DIR = ".github/workflows"
const workflowFiles = fs
  .readdirSync(WORKFLOWS_DIR)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort()

function readWorkflow(name) {
  return fs.readFileSync(path.join(WORKFLOWS_DIR, name), "utf8")
}

test("all GitHub Actions external uses are pinned to 40-char commit SHAs", () => {
  assert.ok(workflowFiles.length > 0, "expected at least one workflow file")

  for (const file of workflowFiles) {
    const lines = readWorkflow(file).split("\n")
    for (const [index, line] of lines.entries()) {
      const match = line.match(/^\s*(?:-\s+)?uses:\s*([^\s#]+)/)
      if (!match) continue

      const ref = match[1]
      if (ref.startsWith("./")) continue

      assert.match(
        ref,
        /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*@[0-9a-f]{40}$/,
        `${file}:${index + 1} must pin external action ${ref} to a 40-char commit SHA`,
      )
      assert.match(line, /#\s*v\d+/, `${file}:${index + 1} should include an inline version comment`)
    }
  }
})

test("all workflows default to empty top-level permissions and explicit job permissions", () => {
  for (const file of workflowFiles) {
    const content = readWorkflow(file)
    assert.match(content, /^permissions:\s*\{\}\s*$/m, `${file} must declare top-level permissions: {}`)

    const jobsSection = content.split(/^jobs:\s*$/m)[1] ?? ""
    const jobBlocks = jobsSection
      .split(/\n(?=  [a-zA-Z0-9_-]+:\s*$)/)
      .filter((block) => /^  [a-zA-Z0-9_-]+:/m.test(block))
    assert.ok(jobBlocks.length > 0, `${file} must define at least one job`)

    for (const block of jobBlocks) {
      const jobName = block.match(/^  ([a-zA-Z0-9_-]+):/m)?.[1] ?? "unknown"
      assert.match(
        block,
        /^    permissions:(?:\s*\{\}|\n(?:      [a-z-]+:\s*(?:read|write|none)\n?)+)/m,
        `${file} job "${jobName}" must declare explicit minimal permissions`,
      )
    }
  }
})

test("workflows do not execute unpinned runtime pnpm dlx/add installs or auto-PR bots", () => {
  for (const file of workflowFiles) {
    const content = readWorkflow(file)
    assert.doesNotMatch(content, /\bpnpm\s+dlx\b/, `${file} must not execute runtime pnpm dlx`)
    assert.doesNotMatch(content, /\bpnpm\s+add\b/, `${file} must not install packages at runtime via pnpm add`)
    assert.doesNotMatch(
      content,
      /peter-evans\/create-pull-request/,
      `${file} must not open automated PRs via GITHUB_TOKEN`,
    )
  }
})

test("build and release workflows isolate contents:write away from pnpm build jobs", () => {
  const buildWorkflow = readWorkflow("build.yml")
  const buildJob = buildWorkflow.match(/  build:\n[\s\S]*?(?=\n  upload-r2:)/)?.[0] ?? ""
  assert.doesNotMatch(buildJob, /contents:\s*write/, "build.yml build job must not grant contents: write")
  assert.doesNotMatch(buildJob, /R2_SECRET_ACCESS_KEY/, "build.yml build job must not receive R2 secrets")

  const releaseWorkflow = readWorkflow("release.yml")
  const preReleaseJob = releaseWorkflow.match(/  pre-release-validation:\n[\s\S]*?(?=\n  build-release:)/)?.[0] ?? ""
  const buildReleaseJob = releaseWorkflow.match(/  build-release:\n[\s\S]*?(?=\n  create-release:)/)?.[0] ?? ""
  assert.doesNotMatch(preReleaseJob, /contents:\s*write/, "release.yml pre-release-validation must not write contents")
  assert.doesNotMatch(buildReleaseJob, /contents:\s*write/, "release.yml build-release must not write contents")
})
