"use client"

import { useTranslation } from "react-i18next"
import { RiTranslate2 } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LOCALE_CODES, type Locale } from "@/lib/i18n"

const languageConfig: Record<string, { text: string; icon: typeof RiTranslate2 }> = {
  en: { text: "English", icon: RiTranslate2 },
  zh: { text: "中文", icon: RiTranslate2 },
  fr: { text: "Français", icon: RiTranslate2 },
  tr: { text: "Türkçe", icon: RiTranslate2 },
  ja: { text: "日本語", icon: RiTranslate2 },
  ko: { text: "한국어", icon: RiTranslate2 },
  de: { text: "Deutsch", icon: RiTranslate2 },
  es: { text: "Español", icon: RiTranslate2 },
  pt: { text: "Português", icon: RiTranslate2 },
  it: { text: "Italiano", icon: RiTranslate2 },
  ru: { text: "Русский", icon: RiTranslate2 },
  id: { text: "Bahasa Indonesia", icon: RiTranslate2 },
}

const options = LOCALE_CODES.map((key) => ({
  label: languageConfig[key]?.text ?? key,
  key,
}))

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLocale = (i18n.language?.split("-")[0] ?? "en") as Locale
  const currentLanguage = languageConfig[currentLocale] ?? languageConfig.en

  const CurrentIcon = currentLanguage.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <CurrentIcon className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="start">
        {options.map(({ label, key }) => (
          <DropdownMenuItem key={key} onSelect={() => i18n.changeLanguage(key)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
