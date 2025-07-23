"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Bell, X, Package, Users, Calendar, Check } from "lucide-react"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { playClickSound } from "@/lib/audio"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()

    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error fetching notifications:", error)
    } else {
      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
    }
  }

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)

    if (error) {
      console.error("Error marking notification as read:", error)
    } else {
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
    } else {
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const toggleNotifications = () => {
    playClickSound()
    setIsOpen(!isOpen)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins} menit yang lalu`
    } else if (diffHours < 24) {
      return `${diffHours} jam yang lalu`
    } else {
      return `${diffDays} hari yang lalu`
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Package className="h-5 w-5 text-red-500" />
      case "debt_due":
        return <Users className="h-5 w-5 text-orange-500" />
      case "sales_target":
        return <Calendar className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="relative">
      <EnhancedButton
        variant="ghost"
        size="sm"
        onClick={toggleNotifications}
        className="relative rounded-full h-10 w-10 p-0"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white"
            variant="destructive"
          >
            {unreadCount}
          </Badge>
        )}
      </EnhancedButton>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsOpen(false)} />
          <Card className="absolute right-0 top-12 z-50 w-80 sm:w-96 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Notifikasi</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <EnhancedButton variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-8">
                    Tandai semua dibaca
                  </EnhancedButton>
                )}
                <EnhancedButton variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </EnhancedButton>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 flex gap-3 ${notification.is_read ? "bg-white" : "bg-blue-50"}`}
                    >
                      <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <span className="text-xs text-gray-500">{formatDate(notification.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>
                      {!notification.is_read && (
                        <EnhancedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="flex-shrink-0 h-6 w-6 p-0 text-blue-500"
                        >
                          <Check className="h-4 w-4" />
                        </EnhancedButton>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada notifikasi</p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
