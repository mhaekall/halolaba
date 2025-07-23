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
      const bottomNav = document.querySelector('[data-bottom-nav="true"]')
      if (bottomNav) {
        ;(bottomNav as HTMLElement).style.display = "none"
      }
    } else {
      document.body.style.overflow = "unset"
      // Show bottom navigation
      const bottomNav = document.querySelector('[data-bottom-nav="true"]')
      if (bottomNav) {
        ;(bottomNav as HTMLElement).style.display = "block"
      }
    }

    return () => {
      document.body.style.overflow = "unset"
      const bottomNav = document.querySelector('[data-bottom-nav="true"]')
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
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} style={{ zIndex: -1 }} />

      {/* Modal Content */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-0 max-h-[90vh] sm:max-h-[85vh] overflow-hidden`}
        style={{
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-white sticky top-0 z-10">
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
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
          {children}
        </div>
      </div>
    </div>
  )
}
