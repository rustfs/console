import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function valueUpdater<T>(
  updater: (prev: T) => T,
  setter: (value: T | ((prev: T) => T)) => void
) {
  setter(updater)
}
