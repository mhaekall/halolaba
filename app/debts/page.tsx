"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { supabase, type Debt, type Product, type DebtItem } from "@/lib/supabase"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/ui/modal"
import { ProductSearch } from "@/components/product-search"
import { Plus, Users, CheckCircle, Clock, Trash2, Minus } from "lucide-react"
import { useConfirmationStore, useToastStore } from "@/lib/confirmation-service"

type DebtWithItems = Debt & {
  debt_items: (DebtItem & { products: Product })[]
}

type CartItem = {
  product: Product
  quantity: number
}

export default function Debts() {
  const [debts, setDebts] = useState<DebtWithItems[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customerName, setCustomerName] = useState("")
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const { showConfirmation } = useConfirmationStore()
  const { showToast } = useToastStore()

  useEffect(() => {
    Promise.all([fetchDebts(), fetchProducts()]).finally(() => setIsLoading(false))
  }, [])

  const fetchDebts = async () => {
    const { data, error } = await supabase
      .from("debts")
      .select(`
        *,
        debt_items (
          *,
          products (
            *
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching debts:", error)
    } else {
      setDebts(data || [])
    }
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").gt("stock", 0).order("name")

    if (error) {
      console.error("Error fetching products:", error)
    } else {
      setProducts(data || [])
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find((item) => item.product.id === product.id)

    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCartItems(
          cartItems.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)),
        )
      }
    } else {
      setCartItems([...cartItems, { product, quantity: 1 }])
    }
  }

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems(cartItems.filter((item) => item.product.id !== productId))
    } else {
      const product = products.find((p) => p.id === productId)
      if (product && newQuantity <= product.stock) {
        setCartItems(
          cartItems.map((item) => (item.product.id === productId ? { ...item, quantity: newQuantity } : item)),
        )
      }
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.selling_price * item.quantity, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName || cartItems.length === 0) return

    try {
      const totalAmount = calculateTotal()

      // Create debt record
      const { data: debt, error: debtError } = await supabase
        .from("debts")
        .insert([
          {
            customer_name: customerName,
            amount: totalAmount,
            status: "unpaid",
          },
        ])
        .select()
        .single()

      if (debtError) throw debtError

      // Create debt items
      for (const item of cartItems) {
        await supabase.from("debt_items").insert([
          {
            debt_id: debt.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.selling_price,
            total_price: item.product.selling_price * item.quantity,
          },
        ])

        // Update product stock
        await supabase
          .from("products")
          .update({
            stock: item.product.stock - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product.id)
      }

      setIsModalOpen(false)
      setCustomerName("")
      setCartItems([])
      fetchDebts()
      fetchProducts()
      showToast("Piutang berhasil ditambahkan! 📝")
    } catch (error) {
      console.error("Error creating debt:", error)
    }
  }

  const handleDelete = async (debt: DebtWithItems) => {
    const confirmed = await showConfirmation({
      title: "Hapus Piutang",
      message: `Yakin ingin menghapus piutang "${debt.customer_name}"? Tindakan ini tidak dapat dibatalkan.`,
      type: "danger",
      confirmText: "Hapus",
      cancelText: "Batal",
    })

    if (confirmed) {
      const { error } = await supabase.from("debts").delete().eq("id", debt.id)

      if (error) {
        console.error("Error deleting debt:", error)
      } else {
        fetchDebts()
        showToast("Piutang berhasil dihapus! 🗑️")
      }
    }
  }

  const markAsPaid = async (debt: DebtWithItems) => {
    const confirmed = await showConfirmation({
      title: "Tandai Lunas",
      message: `Konfirmasi pembayaran piutang "${debt.customer_name}" sebesar ${formatCurrency(debt.amount)}?`,
      type: "success",
      confirmText: "Lunas",
      cancelText: "Batal",
    })

    if (confirmed) {
      const { error } = await supabase
        .from("debts")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", debt.id)

      if (error) {
        console.error("Error marking debt as paid:", error)
      } else {
        fetchDebts()
        showToast("Piutang berhasil dilunasi! 💰")
      }
    }
  }

  const markAsUnpaid = async (debt: DebtWithItems) => {
    const confirmed = await showConfirmation({
      title: "Batal Lunas",
      message: `Yakin ingin membatalkan status lunas piutang "${debt.customer_name}"?`,
      type: "warning",
      confirmText: "Batal Lunas",
      cancelText: "Tidak",
    })

    if (confirmed) {
      const { error } = await supabase
        .from("debts")
        .update({
          status: "unpaid",
          paid_at: null,
        })
        .eq("id", debt.id)

      if (error) {
        console.error("Error marking debt as unpaid:", error)
      } else {
        fetchDebts()
        showToast("Status piutang berhasil diubah! ⏳")
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
    })
  }

  if (isLoading) {
    return (
      <div className="p-4 pt-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const unpaidDebts = debts.filter((debt) => debt.status === "unpaid")
  const totalUnpaidAmount = unpaidDebts.reduce((sum, debt) => sum + debt.amount, 0)

  return (
    <div className="p-4 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Piutang</h1>
          <p className="text-gray-600 text-sm">Kelola piutang pelanggan</p>
        </div>
        <EnhancedButton
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 rounded-2xl px-6 py-3 shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </EnhancedButton>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Total Piutang</CardTitle>
              <Users className="h-4 w-4 opacity-90" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalUnpaidAmount)}</div>
            <p className="text-xs opacity-75 mt-1">{unpaidDebts.length} belum lunas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Piutang Lunas</CardTitle>
              <CheckCircle className="h-4 w-4 opacity-90" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{debts.filter((debt) => debt.status === "paid").length}</div>
            <p className="text-xs opacity-75 mt-1">Sudah dibayar</p>
          </CardContent>
        </Card>
      </div>

      {/* Debts List */}
      <div className="space-y-4">
        {debts.map((debt) => (
          <Card
            key={debt.id}
            className={`bg-white/70 backdrop-blur-sm border-gray-200/50 ${
              debt.status === "paid" ? "bg-green-50/70 border-green-200" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl ${debt.status === "paid" ? "bg-green-100" : "bg-orange-100"}`}>
                  {debt.status === "paid" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        debt.status === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {debt.status === "paid" ? "Lunas" : "Belum Lunas"}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">{debt.customer_name}</h3>

                  {/* Product Items */}
                  <div className="space-y-1 mb-2">
                    {debt.debt_items.map((item) => (
                      <div key={item.id} className="text-xs text-gray-600 flex justify-between">
                        <span>
                          {item.products.name} x{item.quantity}
                        </span>
                        <span>{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500">
                    <p>Dibuat: {formatDate(debt.created_at)}</p>
                    {debt.paid_at && <p>Dibayar: {formatDate(debt.paid_at)}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${debt.status === "paid" ? "text-green-600" : "text-orange-600"}`}>
                      {formatCurrency(debt.amount)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {debt.status === "unpaid" ? (
                      <EnhancedButton
                        size="sm"
                        onClick={() => markAsPaid(debt)}
                        className="bg-green-500 hover:bg-green-600 text-xs px-3"
                      >
                        Lunas
                      </EnhancedButton>
                    ) : (
                      <EnhancedButton
                        size="sm"
                        variant="outline"
                        onClick={() => markAsUnpaid(debt)}
                        className="text-orange-600 hover:text-orange-700 text-xs px-3"
                      >
                        Batal Lunas
                      </EnhancedButton>
                    )}
                    <EnhancedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(debt)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </EnhancedButton>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {debts.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada piutang</h3>
          <p className="text-gray-600 text-sm">Mulai dengan mencatat piutang pertama Anda</p>
        </div>
      )}

      {/* Debt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setCustomerName("")
          setCartItems([])
        }}
        title="Tambah Piutang Baru"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="customer_name" className="text-sm font-medium text-gray-700">
              Nama Pelanggan *
            </Label>
            <Input
              id="customer_name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Pak Budi"
              className="mt-1 rounded-xl"
              required
            />
          </div>

          {/* Product Selection with Search */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Pilih Produk</Label>
            <ProductSearch
              products={products}
              onSelectProduct={addToCart}
              selectedProducts={cartItems.map((item) => item.product.id)}
              placeholder="Cari produk untuk piutang..."
            />
          </div>

          {/* Cart Items */}
          {cartItems.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Produk Dipilih</Label>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-600">{formatCurrency(item.product.selling_price)} per unit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <EnhancedButton
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Minus className="h-3 w-3" />
                      </EnhancedButton>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <EnhancedButton
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className="h-8 w-8 p-0 rounded-full"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </EnhancedButton>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-orange-600">
                        {formatCurrency(item.product.selling_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="p-4 bg-orange-50 rounded-xl mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-800">Total Piutang:</span>
                  <span className="text-xl font-bold text-orange-600">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <EnhancedButton
              type="submit"
              className="flex-1 bg-green-500 hover:bg-green-600 rounded-xl py-3"
              disabled={!customerName || cartItems.length === 0}
            >
              Simpan Piutang
            </EnhancedButton>
            <EnhancedButton
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setCustomerName("")
                setCartItems([])
              }}
              className="flex-1 rounded-xl py-3"
            >
              Batal
            </EnhancedButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
