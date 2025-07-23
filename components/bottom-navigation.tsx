"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, ShoppingCart, BarChart3 } from "lucide-react"
import { playClickSound } from "@/lib/audio"

export function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const handleNavigation = (path: string) => {
    playClickSound()
    router.push(path)
  }

  const navItems = [
    {
      path: "/",
      icon: Home,
      label: "Home",
    },
    {
      path: "/pos",
      icon: ShoppingCart,
      label: "Kasir",
    },
    {
      path: "/reports",
      icon: BarChart3,
      label: "Laporan",
    },
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 px-4 py-2 z-40"
      data-bottom-nav="true"
    >
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = item.icon

          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "bg-blue-500 text-white shadow-lg scale-105"
                  : "text-gray-600 hover:text-blue-500 hover:bg-blue-50"
              }`}
            >
              <Icon className={`h-6 w-6 mb-1 ${isActive ? "text-white" : ""}`} />
              <span className={`text-xs font-medium ${isActive ? "text-white" : ""}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
