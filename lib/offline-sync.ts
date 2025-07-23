import { supabase } from "./supabase"

// Queue for storing offline operations
type OfflineOperation = {
  table: string
  type: "insert" | "update" | "delete"
  data: any
  id?: string
  timestamp: number
}

// Initialize IndexedDB
export const initOfflineDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject("IndexedDB not supported")
      return
    }

    const request = indexedDB.open("HaloLaba_OfflineDB", 1)

    request.onerror = (event) => {
      reject("IndexedDB error")
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create stores for offline data
      if (!db.objectStoreNames.contains("offlineOperations")) {
        db.createObjectStore("offlineOperations", { keyPath: "timestamp" })
      }

      // Create stores for cached data
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("transactions")) {
        db.createObjectStore("transactions", { keyPath: "id" })
      }
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      resolve(db)
    }
  })
}

// Add operation to offline queue
export const addOfflineOperation = async (
  table: string,
  type: "insert" | "update" | "delete",
  data: any,
  id?: string,
) => {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction(["offlineOperations"], "readwrite")
    const store = transaction.objectStore("offlineOperations")

    const operation: OfflineOperation = {
      table,
      type,
      data,
      id,
      timestamp: Date.now(),
    }

    store.add(operation)

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error("Error adding offline operation:", error)
    throw error
  }
}

// Sync offline operations when back online
export const syncOfflineOperations = async () => {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction(["offlineOperations"], "readwrite")
    const store = transaction.objectStore("offlineOperations")
    const operations = await new Promise<OfflineOperation[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Sort operations by timestamp
    operations.sort((a, b) => a.timestamp - b.timestamp)

    // Process operations in order
    for (const operation of operations) {
      try {
        switch (operation.type) {
          case "insert":
            await supabase.from(operation.table).insert(operation.data)
            break
          case "update":
            if (operation.id) {
              await supabase.from(operation.table).update(operation.data).eq("id", operation.id)
            }
            break
          case "delete":
            if (operation.id) {
              await supabase.from(operation.table).delete().eq("id", operation.id)
            }
            break
        }

        // Remove operation after successful sync
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = store.delete(operation.timestamp)
          deleteRequest.onsuccess = () => resolve()
          deleteRequest.onerror = () => reject(deleteRequest.error)
        })
      } catch (error) {
        console.error(`Error syncing operation ${operation.type} for ${operation.table}:`, error)
        // Keep the operation in the queue for next sync attempt
      }
    }
  } catch (error) {
    console.error("Error syncing offline operations:", error)
    throw error
  }
}

// Cache data for offline use
export const cacheData = async (table: string, data: any[]) => {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction([table], "readwrite")
    const store = transaction.objectStore(table)

    // Clear existing data
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => resolve()
      clearRequest.onerror = () => reject(clearRequest.error)
    })

    // Add new data
    for (const item of data) {
      store.add(item)
    }

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error(`Error caching ${table} data:`, error)
    throw error
  }
}

// Get cached data
export const getCachedData = async (table: string) => {
  try {
    const db = await initOfflineDB()
    const transaction = db.transaction([table], "readonly")
    const store = transaction.objectStore(table)

    return new Promise<any[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error(`Error getting cached ${table} data:`, error)
    throw error
  }
}

// Initialize offline sync
export const initOfflineSync = () => {
  // Listen for online/offline events
  window.addEventListener("online", async () => {
    console.log("Back online, syncing data...")
    try {
      await syncOfflineOperations()
      console.log("Sync completed successfully")
    } catch (error) {
      console.error("Error during sync:", error)
    }
  })

  // Initial sync if online
  if (navigator.onLine) {
    syncOfflineOperations().catch(console.error)
  }
}
