"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertTriangle, Trash2, Info } from "lucide-react"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { playClickSound } from "@/lib/audio"

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: "success" | "warning" | "danger" | "info"
  confirmText?: string
  cancelText?: string
  icon?: React.ReactNode
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  confirmText = "OK",
  cancelText = "Batal",
  icon,
}: ConfirmationDialogProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    playClickSound()
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const handleConfirm = () => {
    playClickSound()
    onConfirm()
    handleClose()
  }

  const getTypeConfig = () => {
    switch (type) {
      case "success":
        return {
          bgGradient: "from-emerald-500 to-green-500",
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
          defaultIcon: <CheckCircle className="h-8 w-8" />,
          confirmBg: "bg-emerald-500 hover:bg-emerald-600",
          particles: "emerald",
        }
      case "warning":
        return {
          bgGradient: "from-amber-500 to-orange-500",
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          defaultIcon: <AlertTriangle className="h-8 w-8" />,
          confirmBg: "bg-amber-500 hover:bg-amber-600",
          particles: "amber",
        }
      case "danger":
        return {
          bgGradient: "from-red-500 to-rose-500",
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          defaultIcon: <Trash2 className="h-8 w-8" />,
          confirmBg: "bg-red-500 hover:bg-red-600",
          particles: "red",
        }
      default:
        return {
          bgGradient: "from-blue-500 to-indigo-500",
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          defaultIcon: <Info className="h-8 w-8" />,
          confirmBg: "bg-blue-500 hover:bg-blue-600",
          particles: "blue",
        }
    }
  }

  const config = getTypeConfig()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-white/20 rounded-full animate-pulse`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Dialog */}
      <div
        className={`relative w-full max-w-sm bg-white rounded-3xl shadow-2xl transform transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${config.bgGradient} p-6 rounded-t-3xl relative overflow-hidden`}>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />

          {/* Close button */}
          <EnhancedButton
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </EnhancedButton>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`${config.iconBg} p-4 rounded-2xl shadow-lg`}>
              <div className={config.iconColor}>{icon || config.defaultIcon}</div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center">{title}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-center mb-6 leading-relaxed">{message}</p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <EnhancedButton
              onClick={handleClose}
              variant="outline"
              className="flex-1 rounded-xl py-3 border-gray-300 hover:bg-gray-50"
            >
              {cancelText}
            </EnhancedButton>
            <EnhancedButton
              onClick={handleConfirm}
              className={`flex-1 ${config.confirmBg} text-white rounded-xl py-3 shadow-lg`}
            >
              {confirmText}
            </EnhancedButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// Success Toast Component
export function SuccessToast({
  isOpen,
  onClose,
  message,
  duration = 3000,
}: {
  isOpen: boolean
  onClose: () => void
  message: string
  duration?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className={`bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 ${
          isVisible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
        }`}
      >
        {/* Success icon with animation */}
        <div className="relative">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
          {/* Ripple effect */}
          <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
        </div>

        <span className="font-medium">{message}</span>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
      </div>
    </div>
  )
}
