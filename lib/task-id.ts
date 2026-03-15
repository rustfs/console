import { randomUUID } from "./functions"

export function createTaskId(seed: string): string {
  const prefix = Date.now()
  return `${prefix}-${randomUUID()}-${seed}`
}

