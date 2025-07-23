"use client"

import type React from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { playClickSound } from "@/lib/audio"
import { forwardRef } from "react"

interface EnhancedButtonProps extends ButtonProps {
  soundEnabled?: boolean
}

export const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ onClick, soundEnabled = true, className, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (soundEnabled) {
        playClickSound()
      }
      onClick?.(e)
    }

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        className={`transition-all duration-200 active:scale-95 ${className}`}
        {...props}
      >
        {children}
      </Button>
    )
  },
)

EnhancedButton.displayName = "EnhancedButton"
