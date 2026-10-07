export function buildEventTargetSubscriptionsPath(service: string, targetName: string) {
  return `/target/${encodeURIComponent(`notify_${service}`)}/${encodeURIComponent(targetName)}/subscriptions`
}
