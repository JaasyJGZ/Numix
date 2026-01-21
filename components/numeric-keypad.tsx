"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

interface NumericKeypadProps {
  onInput: (value: string) => void
  onComplete: () => void
}

export function NumericKeypad({ onInput, onComplete }: NumericKeypadProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const handleNumberClick = (num: string) => {
    setActiveKey(num)
    onInput(num)

    // Reset active key after animation
    setTimeout(() => setActiveKey(null), 200)
  }

  // Add keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleNumberClick(e.key)
      } else if (e.key === "Backspace") {
        handleNumberClick("⌫")
      } else if (e.key === "Enter") {
        onComplete()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onComplete]) // Removed handleNumberClick from dependencies

  return (
    <div className="bg-gradient-to-r from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-t-xl p-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((key) => (
          <Button
            key={key}
            onClick={() => handleNumberClick(String(key))}
            className={`h-14 sm:h-16 text-xl font-medium rounded-full bg-white/10 hover:bg-white/20 text-white 
              transition-all duration-200 transform active:scale-95 relative overflow-hidden
              ${activeKey === String(key) ? "bg-white/20" : ""}`}
          >
            <span className="relative z-10">{key}</span>
            <span
              className={`absolute inset-0 bg-gradient-to-r from-[#FF6B6B]/20 to-[#4ECDC4]/20 
              transition-opacity duration-300 opacity-0 ${activeKey === String(key) ? "opacity-100" : ""}`}
            ></span>
          </Button>
        ))}
        <Button
          onClick={() => handleNumberClick("⌫")}
          className={`h-14 sm:h-16 text-xl font-medium rounded-full bg-[#FF6B6B]/20 hover:bg-[#FF6B6B]/30 text-[#FF6B6B]
            transition-all duration-200 transform active:scale-95 ${activeKey === "⌫" ? "bg-[#FF6B6B]/30" : ""}`}
        >
          ⌫
        </Button>
        <Button
          key={number}
          onClick={() => onNumberClick(number)}
          className={`h-14 sm:h-16 text-xl font-medium rounded-full bg-input hover:bg-muted text-foreground
            transition-all duration-200 transform hover:scale-105 active:scale-95
            shadow-lg hover:shadow-xl`}
        >
          {number}
        </Button>
        <Button
          onClick={onComplete}
          className="h-14 sm:h-16 text-xl font-medium rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90 text-black
            transition-all duration-200 transform active:scale-95 shadow-md hover:shadow-lg"
        >
          ✓
        </Button>
      </div>
    </div>
  )
}

