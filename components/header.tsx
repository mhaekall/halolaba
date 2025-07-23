"use client"

import { useState, useEffect } from "react"
import { Store } from "lucide-react"
import { NotificationCenter } from "@/components/notifications/notification-center"

export function Header() {
  // navigator is only defined in browser
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // guard for SSR
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-2">
        <Store className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">HaloLaba</h1>
        {!isOnline && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Mode Offline</span>
        )}
      </div>
      <NotificationCenter />
    </header>
  )
}
