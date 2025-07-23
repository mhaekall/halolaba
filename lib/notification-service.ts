import { supabase } from "./supabase"

export type NotificationType = "low_stock" | "debt_due" | "sales_target" | "system"

export const createNotification = async (
  title: string,
  message: string,
  type: NotificationType,
  relatedId?: string,
) => {
  try {
    const { error } = await supabase.from("notifications").insert([
      {
        title,
        message,
        type,
        related_id: relatedId,
        is_read: false,
      },
    ])

    if (error) throw error
    console.log("Notification created:", title)
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

// Check for low stock and create notifications
export const checkLowStockNotifications = async () => {
  try {
    const { data: products } = await supabase.from("products").select("id, name, stock, minimal_stock").lte("stock", 10) // Check products with stock <= 10

    if (products) {
      for (const product of products) {
        // Check if notification already exists for this product
        const { data: existingNotification } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "low_stock")
          .eq("related_id", product.id)
          .eq("is_read", false)
          .single()

        if (!existingNotification) {
          const isCritical = product.stock < product.minimal_stock / 2
          const isLow = product.stock <= product.minimal_stock

          if (isCritical) {
            await createNotification(
              "🚨 Stok Kritis!",
              `${product.name} hampir habis (${product.stock} tersisa)`,
              "low_stock",
              product.id,
            )
          } else if (isLow) {
            await createNotification(
              "⚠️ Stok Menipis",
              `${product.name} perlu direstock (${product.stock} tersisa)`,
              "low_stock",
              product.id,
            )
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking low stock notifications:", error)
  }
}

// Check for overdue debts and create notifications
export const checkOverdueDebtNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: overdueDebts } = await supabase
      .from("debts")
      .select("id, customer_name, amount, created_at")
      .eq("status", "unpaid")
      .lt("created_at", thirtyDaysAgo.toISOString())

    if (overdueDebts) {
      for (const debt of overdueDebts) {
        // Check if notification already exists for this debt
        const { data: existingNotification } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "debt_due")
          .eq("related_id", debt.id)
          .eq("is_read", false)
          .single()

        if (!existingNotification) {
          const daysPast = Math.floor(
            (new Date().getTime() - new Date(debt.created_at).getTime()) / (1000 * 60 * 60 * 24),
          )

          await createNotification(
            "💰 Piutang Jatuh Tempo",
            `Piutang ${debt.customer_name} sudah ${daysPast} hari (${new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(debt.amount)})`,
            "debt_due",
            debt.id,
          )
        }
      }
    }
  } catch (error) {
    console.error("Error checking overdue debt notifications:", error)
  }
}

// Initialize notification checking
export const initNotificationService = () => {
  // Check notifications every 5 minutes
  const checkInterval = setInterval(
    () => {
      checkLowStockNotifications()
      checkOverdueDebtNotifications()
    },
    5 * 60 * 1000,
  ) // 5 minutes

  // Initial check
  checkLowStockNotifications()
  checkOverdueDebtNotifications()

  return () => clearInterval(checkInterval)
}
