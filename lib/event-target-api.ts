export function buildEventTargetSubscriptionsPath(service: string, targetName: string) {
  return `/target/${encodeURIComponent(`notify_${service}`)}/${encodeURIComponent(targetName)}/subscriptions`
}

export function buildEventTargetInstanceUrl(baseUrl: string, service: string, targetName: string) {
  const url = new URL(baseUrl)
  if (!/\/rustfs\/admin\/v3\/?$/.test(url.pathname)) {
    throw new Error("Unsupported admin API base URL")
  }
  url.pathname = url.pathname.replace(
    /\/v3\/?$/,
    `/v4/plugins/instances/builtin:${encodeURIComponent(service)}:notify:${encodeURIComponent(targetName.toLowerCase())}`,
  )
  url.search = ""
  url.hash = ""
  return url.toString()
}

export function editableEventTarget(
  instance: { service: string; account_id: string; source: string; enabled: boolean },
  service: string,
  name: string,
) {
  return (
    instance.service === service &&
    instance.account_id.toLowerCase() === name.toLowerCase() &&
    instance.source === "config" &&
    instance.enabled === true
  )
}

export class EventTargetRevisionUnavailableError extends Error {}

export function parseEditableEventTarget(value: unknown, service: string, name: string) {
  if (!value || typeof value !== "object") throw new Error("Invalid destination response")
  const instance = value as Record<string, unknown>
  if (
    typeof instance.service !== "string" ||
    typeof instance.account_id !== "string" ||
    typeof instance.source !== "string" ||
    typeof instance.enabled !== "boolean" ||
    !editableEventTarget(
      instance as { service: string; account_id: string; source: string; enabled: boolean },
      service,
      name,
    ) ||
    !instance.config ||
    typeof instance.config !== "object" ||
    Array.isArray(instance.config) ||
    Object.values(instance.config).some((field) => typeof field !== "string")
  ) {
    throw new Error("Destination cannot be edited")
  }
  if (typeof instance.config_revision !== "string" || !instance.config_revision.trim()) {
    throw new EventTargetRevisionUnavailableError()
  }
  return { config: { ...(instance.config as Record<string, string>) }, revision: instance.config_revision }
}

export function buildEventTargetUpdatePayload(
  config: Record<string, string | number>,
  expectedConfig: Record<string, string>,
  expectedRevision: string,
) {
  if (!expectedRevision.trim()) throw new EventTargetRevisionUnavailableError()
  return {
    key_values: Object.entries(config).map(([key, value]) => ({ key, value: String(value) })),
    expected_config: expectedConfig,
    expected_revision: expectedRevision,
  }
}
