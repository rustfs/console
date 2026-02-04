"use client"

import { useCallback, useEffect, useState } from "react"

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item) as T
  } catch {
    return defaultValue
  }
}

function setStorageValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // ignore
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => getStorageValue(key, defaultValue))

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue) as T)
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [key])

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue
        setStorageValue(key, next)
        return next
      })
    },
    [key],
  )

  return [value, setStoredValue] as const
}
