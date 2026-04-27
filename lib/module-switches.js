const MODULE_SWITCH_ENV_KEYS = {
  notify: "RUSTFS_NOTIFY_ENABLE",
  audit: "RUSTFS_AUDIT_ENABLE",
}

export function isEnvManagedSource(source) {
  return source === "env"
}

export function getModuleSwitchEnvKey(moduleName) {
  return MODULE_SWITCH_ENV_KEYS[moduleName]
}

export function isModuleSwitchEnvConflictError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("managed by environment variable")
}
