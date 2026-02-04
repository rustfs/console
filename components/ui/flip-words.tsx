"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface FlipWordsProps {
  words: string[]
  duration?: number
  className?: string
}

export function FlipWords({ words, duration = 3000, className }: FlipWordsProps) {
  const [wordIndex, setWordIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!isVisible || words.length === 0) return

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false)

      setTimeout(() => {
        indexRef.current = (indexRef.current + 1) % words.length
        setWordIndex(indexRef.current)
        setIsVisible(true)
      }, 600)
    }, duration)

    return () => clearTimeout(timeoutId)
  }, [isVisible, duration, words.length])

  const currentWord = words[wordIndex] ?? words[0] ?? ""
  const splitWords = currentWord.split(" ").map((word) => ({
    word,
    letters: word.split(""),
  }))

  if (!isVisible) {
    return <span className={cn("relative inline-block min-w-[1em]", className)} />
  }

  return (
    <span className={cn("relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100", className)}>
      {splitWords.map((wordObj, wordIndex) => (
        <span
          key={`${wordObj.word}-${wordIndex}`}
          className="inline-block whitespace-nowrap opacity-0 animate-[fadeInWord_0.3s_ease_forwards]"
          style={{
            animationDelay: `${wordIndex * 0.3}s`,
          }}
        >
          {wordObj.letters.map((letter, letterIndex) => (
            <span
              key={`${letter}-${letterIndex}`}
              className="inline-block opacity-0 animate-[fadeInLetter_0.2s_ease_forwards]"
              style={{
                animationDelay: `${wordIndex * 0.3 + letterIndex * 0.05}s`,
              }}
            >
              {letter}
            </span>
          ))}
          <span className="inline-block">&nbsp;</span>
        </span>
      ))}
    </span>
  )
}
