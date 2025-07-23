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
      const bottomNav = document.querySelector('[class*="bottom-0"]')
      if (bottomNav) {
        ;(bottomNav as HTMLElement).style.display = "none"
      }
    } else {
      document.body.style.overflow = "unset"
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-0 max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="rounded-full h-10 w-10 p-0 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] sm:max-h-[calc(85vh-80px)]">{children}</div>
      </div>
    </div>
  )
}
