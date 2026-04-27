export function canManageNotifyBackedFeature(notifyEnabled: boolean | undefined) {
  return notifyEnabled !== false
}
