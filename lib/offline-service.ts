import { supabase } from "./supabase"
import { initOfflineDB, addOfflineOperation, syncOfflineOperations, cacheData, getCachedData } from "./offline-sync"

export class OfflineService {
  private static instance: OfflineService
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true
  private syncInProgress = false

  private constructor() {
    this.setupEventListeners()
    this.initializeOfflineDB()
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService()
    }
    return OfflineService.instance
  }

  private setupEventListeners() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline.bind(this))
      window.addEventListener("offline", this.handleOffline.bind(this))
    }
  }

  private async initializeOfflineDB() {
    try {
      await initOfflineDB()
      console.log("Offline database initialized")
    } catch (error) {
      console.error("Failed to initialize offline database:", error)
    }
  }

  private async handleOnline() {
    this.isOnline = true
    console.log("🟢 Back online - starting sync...")

    if (!this.syncInProgress) {
      this.syncInProgress = true
      try {
        await syncOfflineOperations()
        await this.cacheEssentialData()
        console.log("✅ Sync completed successfully")
      } catch (error) {
        console.error("❌ Sync failed:", error)
      } finally {
        this.syncInProgress = false
      }
    }
  }

  private handleOffline() {
    this.isOnline = false
    console.log("🔴 Gone offline - switching to offline mode")
  }

  private async cacheEssentialData() {
    try {
      // Cache products
      const { data: products } = await supabase.from("products").select("*")
      if (products) {
        await cacheData("products", products)
      }

      // Cache recent transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
      if (transactions) {
        await cacheData("transactions", transactions)
      }

      console.log("📦 Essential data cached for offline use")
    } catch (error) {
      console.error("Failed to cache data:", error)
    }
  }

  // Offline-aware database operations
  public async createTransaction(transactionData: any, items: any[]) {
    if (this.isOnline) {
      try {
        // Online: Direct database operation
        const { data: transaction, error } = await supabase
          .from("transactions")
          .insert([transactionData])
          .select()
          .single()

        if (error) throw error

        // Insert transaction items
        for (const item of items) {
          await supabase.from("transaction_items").insert([
            {
              ...item,
              transaction_id: transaction.id,
            },
          ])

          // Update product stock
          await supabase.from("products").update({ stock: item.newStock }).eq("id", item.product_id)
        }

        return transaction
      } catch (error) {
        console.error("Online transaction failed:", error)
        throw error
      }
    } else {
      // Offline: Queue operation
      const offlineTransactionId = `offline_${Date.now()}`

      await addOfflineOperation("transactions", "insert", {
        ...transactionData,
        id: offlineTransactionId,
      })

      for (const item of items) {
        await addOfflineOperation("transaction_items", "insert", {
          ...item,
          transaction_id: offlineTransactionId,
        })

        await addOfflineOperation("products", "update", { stock: item.newStock }, item.product_id)
      }

      console.log("📱 Transaction queued for offline sync")
      return { id: offlineTransactionId, ...transactionData }
    }
  }

  public async getProducts() {
    if (this.isOnline) {
      try {
        const { data, error } = await supabase.from("products").select("*")
        if (error) throw error

        // Cache for offline use
        await cacheData("products", data || [])
        return data || []
      } catch (error) {
        console.error("Failed to fetch products online, using cache:", error)
        return await getCachedData("products")
      }
    } else {
      // Offline: Use cached data
      console.log("📱 Using cached products (offline mode)")
      return await getCachedData("products")
    }
  }

  public isOffline(): boolean {
    return !this.isOnline
  }

  public async forcSync() {
    if (this.isOnline && !this.syncInProgress) {
      await this.handleOnline()
    }
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance()
