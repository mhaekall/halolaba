"use client"

import { useEffect, useState } from "react"
import { supabase, type Product } from "@/lib/supabase"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/ui/modal"
import { Plus, ShoppingBag, Trash2, Package, Search, Minus, Calendar } from "lucide-react"
import { useConfirmationStore, useToastStore } from "@/lib/confirmation-service"

type RestockItem = {
  product: Product
  quantity: number
}

type RestockTransaction = {
  id: string
  total_amount: number
  supplier_name: string | null
  created_at: string
  restock_items: {
    id: string
    product_id: string
    quantity: number
    unit_cost: number
    total_cost: number
    products: {
      name: string
    }
  }[]
}

export default function Restock() {
  const [restockTransactions, setRestockTransactions] = useState<RestockTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [restockItems, setRestockItems] = useState<RestockItem[]>([])
  const [supplierName, setSupplierName] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const { showConfirmation } = useConfirmationStore()
  const { showToast } = useToastStore()

  useEffect(() => {
    Promise.all([fetchRestockTransactions(), fetchProducts()]).finally(() => setIsLoading(false))
  }, [])

  const fetchRestockTransactions = async () => {
    const { data, error } = await supabase
      .from("restock_transactions")
      .select(`
        *,
        restock_items (
          *,
          products (
            name
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching restock transactions:", error)
    } else {
      setRestockTransactions(data || [])
    }
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("name")

    if (error) {
      console.error("Error fetching products:", error)
    } else {
      setProducts(data || [])
    }
  }

  const addRestockItem = (product: Product) => {
    const existingItem = restockItems.find((item) => item.product.id === product.id)
    if (!existingItem) {
      setRestockItems([...restockItems, { product, quantity: 1 }])
    }
  }

  const updateRestockQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setRestockItems(restockItems.filter((item) => item.product.id !== productId))
    } else {
      setRestockItems(restockItems.map((item) => (item.product.id === productId ? { ...item, quantity } : item)))
    }
  }

  const calculateRestockTotal = () => {
    return restockItems.reduce((total, item) => total + item.product.cost_price * item.quantity, 0)
  }

  const handleRestockSubmit = async () => {
    if (restockItems.length === 0) return

    try {
      const totalAmount = calculateRestockTotal()

      // Create restock transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("restock_transactions")
        .insert([
          {
            total_amount: totalAmount,
            supplier_name: supplierName || null,
          },
        ])
        .select()
        .single()

      if (transactionError) throw transactionError

      // Create restock items and update product stocks
      for (const item of restockItems) {
        // Add restock item
        await supabase.from("restock_items").insert([
          {
            restock_id: transaction.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_cost: item.product.cost_price,
            total_cost: item.product.cost_price * item.quantity,
          },
        ])

        // Update product stock
        await supabase
          .from("products")
          .update({
            stock: item.product.stock + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product.id)
      }

      setRestockItems([])
      setSupplierName("")
      setIsModalOpen(false)
      fetchRestockTransactions()
      fetchProducts()
      showToast("Restock berhasil diproses! 📦")
    } catch (error) {
      console.error("Error processing restock:", error)
    }
  }

  const handleDelete = async (transaction: RestockTransaction) => {
    const confirmed = await showConfirmation({
      title: "Hapus Transaksi Restock",
      message: `Yakin ingin menghapus transaksi restock senilai ${formatCurrency(transaction.total_amount)}? Stok produk akan dikembalikan ke kondisi sebelumnya.`,
      type: "danger",
      confirmText: "Hapus",
      cancelText: "Batal",
    })

    if (confirmed) {
      try {
        // Get restock items to revert stock changes
        const { data: restockItems } = await supabase
          .from("restock_items")
          .select("product_id, quantity, products(stock)")
          .eq("restock_id", transaction.id)

        if (restockItems) {
          // Revert stock changes for each item
          for (const item of restockItems) {
            await supabase
              .from("products")
              .update({
                stock: item.products.stock - item.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.product_id)
          }
        }

        // Delete the restock transaction (cascade will delete items)
        const { error } = await supabase.from("restock_transactions").delete().eq("id", transaction.id)

        if (error) throw error

        fetchRestockTransactions()
        fetchProducts()
        showToast("Transaksi restock berhasil dihapus! 🗑️")
      } catch (error) {
        console.error("Error deleting restock transaction:", error)
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const totalRestockAmount = restockTransactions.reduce((sum, transaction) => sum + transaction.total_amount, 0)

  if (isLoading) {
    return (
      <div className="p-4 pt-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restock Barang</h1>
          <p className="text-gray-600 text-sm">Kelola pembelian stok barang (HPP)</p>
        </div>
        <EnhancedButton
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 rounded-2xl px-6 py-3 shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </EnhancedButton>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white">
        <CardHeader>
          <CardTitle className="text-lg opacity-90">Total Restock (HPP)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalRestockAmount)}</p>
              <p className="text-sm opacity-75">{restockTransactions.length} transaksi</p>
            </div>
            <ShoppingBag className="h-12 w-12 opacity-20" />
          </div>
        </CardContent>
      </Card>

      {/* Restock Transactions List */}
      <div className="space-y-4">
        {restockTransactions.map((transaction) => (
          <Card key={transaction.id} className="bg-white/70 backdrop-blur-sm border-gray-200/50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Restock {transaction.supplier_name ? `dari ${transaction.supplier_name}` : ""}
                    </CardTitle>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>
                <EnhancedButton
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(transaction)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </EnhancedButton>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transaction.restock_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{item.products.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-600">
                        {item.quantity} x {formatCurrency(item.unit_cost)}
                      </span>
                      <span className="text-sm font-semibold text-blue-600">{formatCurrency(item.total_cost)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg mt-3">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(transaction.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {restockTransactions.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada transaksi restock</h3>
          <p className="text-gray-600 text-sm">Mulai dengan menambahkan restock pertama Anda</p>
        </div>
      )}

      {/* Restock Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setRestockItems([])
          setSupplierName("")
        }}
        title="Tambah Restock Barang"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="supplier_name" className="text-sm font-medium text-gray-700">
              Nama Supplier (Opsional)
            </Label>
            <Input
              id="supplier_name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Contoh: Toko Grosir Jaya"
              className="mt-1 rounded-xl"
            />
          </div>

          {/* Product Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Pilih Produk untuk Restock</Label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {filteredProducts
                .filter((product) => !restockItems.find((item) => item.product.id === product.id))
                .map((product) => (
                  <EnhancedButton
                    key={product.id}
                    onClick={() => addRestockItem(product)}
                    variant="outline"
                    className="p-3 text-left justify-between rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-600">
                        Stok: {product.stock} | {formatCurrency(product.cost_price)}
                      </p>
                    </div>
                    <Plus className="h-4 w-4" />
                  </EnhancedButton>
                ))}
            </div>
          </div>

          {/* Selected Items */}
          {restockItems.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Produk yang Dipilih</Label>
              <div className="space-y-3">
                {restockItems.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-600">{formatCurrency(item.product.cost_price)} per unit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <EnhancedButton
                        size="sm"
                        variant="outline"
                        onClick={() => updateRestockQuantity(item.product.id, item.quantity - 1)}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Minus className="h-3 w-3" />
                      </EnhancedButton>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <EnhancedButton
                        size="sm"
                        variant="outline"
                        onClick={() => updateRestockQuantity(item.product.id, item.quantity + 1)}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Plus className="h-3 w-3" />
                      </EnhancedButton>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-blue-600">
                        {formatCurrency(item.product.cost_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="p-4 bg-blue-50 rounded-xl mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800">Total Belanja:</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(calculateRestockTotal())}</span>
                </div>
              </div>

              <EnhancedButton
                onClick={handleRestockSubmit}
                className="w-full bg-green-500 hover:bg-green-600 rounded-xl py-3 mt-4"
              >
                Proses Restock
              </EnhancedButton>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
