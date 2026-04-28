export function canManageAuditTargets(auditEnabled: boolean | undefined) {
  return auditEnabled !== false
}
