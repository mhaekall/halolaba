"use client"

import type React from "react"
import { useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { playClickSound } from "@/lib/audio"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      // Hide bottom navigation
      const bottomNav = document.querySelector('[class*="bottom-0"]')
      if (bottomNav) {
        ;(bottomNav as HTMLElement).style.display = "none"
      }
    } else {
      document.body.style.overflow = "unset"
      // Show bottom navigation
      const bottomNav = document.querySelector('[class*="bottom-0"]')
      if (bottomNav) {
        ;(bottomNav as HTMLElement).style.display = "block"
      }
    }

    return () => {
      document.body.style.overflow = "unset"
      const bottomNav = document.querySelector('[class*="bottom-0"]')
      if (bottomNav) {
        ;(bottomNav as HTMLElement).style.display = "block"
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }

  const handleClose = () => {
    playClickSound()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 max-h-[90vh] overflow-hidden`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="rounded-full h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">{children}</div>
      </div>
    </div>
  )
}
