export function scheduleMicrotask(callback: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback)
    return
  }

  if (typeof Promise === "function") {
    void Promise.resolve().then(callback)
    return
  }

  globalThis.setTimeout(callback, 0)
}
