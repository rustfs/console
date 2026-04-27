export type ModuleSwitchName = "notify" | "audit"
export type ModuleSwitchSource = "env" | "console" | "default"

export interface ModuleSwitchSnapshot {
  notify_enabled: boolean
  audit_enabled: boolean
  persisted_notify_enabled: boolean
  persisted_audit_enabled: boolean
  notify_source: ModuleSwitchSource
  audit_source: ModuleSwitchSource
}

export interface ModuleSwitchPayload {
  notify_enabled: boolean
  audit_enabled: boolean
}

const MODULE_SWITCH_ENV_KEYS: Record<ModuleSwitchName, string> = {
  notify: "RUSTFS_NOTIFY_ENABLE",
  audit: "RUSTFS_AUDIT_ENABLE",
}

export function isEnvManagedSource(source: ModuleSwitchSource) {
  return source === "env"
}

export function getModuleSwitchEnvKey(moduleName: ModuleSwitchName) {
  return MODULE_SWITCH_ENV_KEYS[moduleName]
}

export function isModuleSwitchEnvConflictError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("managed by environment variable")
}
