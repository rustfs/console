"use client"

import { useCallback, useEffect, useRef, useState } from "react"

function getStorageValue<T>(key: string, defaultValue: T, fallbackValue = defaultValue): T {
  if (typeof window === "undefined") return defaultValue
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item) as T
  } catch {
    return fallbackValue
  }
}

function setStorageValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return false
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
    return true
  } catch {
    return false
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T, requirePersistence = false) {
  const [value, setValue] = useState<T>(() => getStorageValue(key, defaultValue))
  const valueRef = useRef(value)
  const getStoredValue = useCallback(() => getStorageValue(key, defaultValue, valueRef.current), [key, defaultValue])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        // A queued event may describe a session that has already been replaced.
        const next = getStorageValue(key, defaultValue)
        valueRef.current = next
        setValue(next)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [defaultValue, key])

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const next = typeof newValue === "function" ? (newValue as (prev: T) => T)(valueRef.current) : newValue
      // Persist before scheduling React work so a later login cannot be erased by a replayed updater.
      const persisted = setStorageValue(key, next)
      if (!persisted && requirePersistence && next !== undefined && next !== null) {
        throw new Error("Unable to save the session in browser storage")
      }
      valueRef.current = next
      setValue(next)
    },
    [key, requirePersistence],
  )

  return [value, setStoredValue, getStoredValue] as const
}
