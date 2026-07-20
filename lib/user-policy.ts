type PolicyStatement = Record<string, unknown>

export function normalizePolicyStatements(policyName: string, rawPolicy: unknown): PolicyStatement[] {
  const policy = typeof rawPolicy === "string" ? (JSON.parse(rawPolicy) as unknown) : rawPolicy

  if (typeof policy !== "object" || policy === null || Array.isArray(policy)) {
    throw new TypeError("Policy must be a valid JSON object")
  }

  const statements = (policy as { Statement?: unknown }).Statement
  if (statements === undefined) return []
  if (!Array.isArray(statements)) {
    throw new TypeError("Policy Statement must be an array")
  }

  return statements.map((statement) => {
    if (typeof statement !== "object" || statement === null || Array.isArray(statement)) {
      throw new TypeError("Policy Statement entries must be JSON objects")
    }

    const normalized = statement as PolicyStatement
    return {
      ...normalized,
      Sid: normalized.Sid ?? policyName,
    }
  })
}
