"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { Home, ShoppingCart, TrendingUp } from "lucide-react"
import { playClickSound, initAudio } from "@/lib/audio"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Kasir", href: "/pos", icon: ShoppingCart },
  { name: "Laporan", href: "/reports", icon: TrendingUp },
]

export function BottomNavigation() {
  const pathname = usePathname()

  useEffect(() => {
    // Initialize audio on component mount
    initAudio()
  }, [])

  const handleClick = () => {
    playClickSound()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="mx-3 mb-3 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-xl">
        <nav className="flex items-center justify-around px-1 py-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleClick}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 min-w-0 flex-1 ${
                  isActive
                    ? "bg-blue-500 text-white shadow-lg scale-105"
                    : "text-gray-600 hover:text-blue-500 hover:bg-blue-50 active:scale-95"
                }`}
              >
                <item.icon className={`h-5 w-5 mb-1 ${isActive ? "text-white" : ""}`} />
                <span className={`text-xs font-medium truncate ${isActive ? "text-white" : ""}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
