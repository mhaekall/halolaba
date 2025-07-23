"use client"

import { useEffect, useState } from "react"
import { supabase, type Expense, type Product } from "@/lib/supabase"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"
import { Plus, Receipt, Trash2, ShoppingBag, Zap, Coffee, Package2, Minus } from "lucide-react"
import { playSuccessSound } from "@/lib/audio"

type RestockItem = {
  product: Product
  quantity: number
}

const operationalCategories = [
  { id: "listrik", name: "Listrik", icon: Zap },
  { id: "kantong_plastik", name: "Kantong Plastik", icon: Package2 },
  { id: "cup", name: "Cup/Gelas", icon: Coffee },
  { id: "custom", name: "Lainnya", icon: Receipt },
]

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [isOperationalModalOpen, setIsOperationalModalOpen] = useState(false)
  const [restockItems, setRestockItems] = useState<RestockItem[]>([])
  const [operationalForm, setOperationalForm] = useState({
    category: "",
    amount: "",
    description: "",
  })

  useEffect(() => {
    fetchExpenses()
    fetchProducts()
  }, [])

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        products (
          name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching expenses:", error)
    } else {
      setExpenses(data || [])
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
      const description = `Restock: ${restockItems.map((item) => `${item.product.name} (${item.quantity})`).join(", ")}`

      // Create expense record
      const { error: expenseError } = await supabase.from("expenses").insert([
        {
          description,
          amount: totalAmount,
          category: "Restock Barang",
          expense_type: "restock",
          expense_category: "restock",
        },
      ])

      if (expenseError) throw expenseError

      // Update product stocks
      for (const item of restockItems) {
        await supabase
          .from("products")
          .update({
            stock: item.product.stock + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product.id)
      }

      setRestockItems([])
      setIsRestockModalOpen(false)
      fetchExpenses()
      fetchProducts()
      playSuccessSound()
    } catch (error) {
      console.error("Error processing restock:", error)
    }
  }

  const handleOperationalSubmit = async () => {
    if (!operationalForm.category || !operationalForm.amount) return

    try {
      const categoryData = operationalCategories.find((cat) => cat.id === operationalForm.category)
      const description =
        operationalForm.category === "custom" ? operationalForm.description : `Pembayaran ${categoryData?.name}`

      const { error } = await supabase.from("expenses").insert([
        {
          description,
          amount: Number.parseFloat(operationalForm.amount),
          category: categoryData?.name || "Lainnya",
          expense_type: "operational",
          expense_category: "operational",
        },
      ])

      if (error) throw error

      setOperationalForm({ category: "", amount: "", description: "" })
      setIsOperationalModalOpen(false)
      fetchExpenses()
      playSuccessSound()
    } catch (error) {
      console.error("Error adding operational expense:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus pengeluaran ini?")) {
      const { error } = await supabase.from("expenses").delete().eq("id", id)

      if (error) {
        console.error("Error deleting expense:", error)
      } else {
        fetchExpenses()
        playSuccessSound()
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

  const restockExpenses = expenses.filter((expense) => expense.expense_category === "restock")
  const operationalExpenses = expenses.filter((expense) => expense.expense_category === "operational")
  const totalRestockAmount = restockExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalOperationalAmount = operationalExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="p-4 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengeluaran</h1>
          <p className="text-gray-600 text-sm">Restock barang & biaya operasional</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <EnhancedButton
          onClick={() => setIsRestockModalOpen(true)}
          className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white h-auto flex flex-col items-center"
        >
          <ShoppingBag className="h-6 w-6 mb-2" />
          <p className="font-semibold text-sm">Belanja Restock</p>
          <p className="text-xs opacity-75">Tambah stok produk</p>
        </EnhancedButton>

        <EnhancedButton
          onClick={() => setIsOperationalModalOpen(true)}
          className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl text-white h-auto flex flex-col items-center"
        >
          <Receipt className="h-6 w-6 mb-2" />
          <p className="font-semibold text-sm">Biaya Operasional</p>
          <p className="text-xs opacity-75">Listrik, plastik, dll</p>
        </EnhancedButton>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm opacity-90">Restock Barang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalRestockAmount)}</div>
            <p className="text-xs opacity-75">{restockExpenses.length} transaksi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 border-0 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm opacity-90">Biaya Operasional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalOperationalAmount)}</div>
            <p className="text-xs opacity-75">{operationalExpenses.length} pembayaran</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        {expenses.map((expense) => (
          <Card key={expense.id} className="bg-white/70 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-xl ${
                    expense.expense_category === "restock" ? "bg-blue-100" : "bg-orange-100"
                  }`}
                >
                  {expense.expense_category === "restock" ? (
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Receipt className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        expense.expense_category === "restock"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {expense.category}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{expense.description}</h3>
                  <p className="text-sm text-gray-600">{formatDate(expense.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                  </div>
                  <EnhancedButton
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </EnhancedButton>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {expenses.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada pengeluaran</h3>
          <p className="text-gray-600 text-sm">Mulai dengan mencatat pengeluaran pertama Anda</p>
        </div>
      )}

      {/* Restock Modal */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => {
          setIsRestockModalOpen(false)
          setRestockItems([])
        }}
        title="Belanja Restock"
        size="lg"
      >
        <div className="space-y-6">
          {/* Product Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Pilih Produk untuk Restock</Label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {products
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
                className="w-full bg-green-500 hover:bg-green-600 rounded-xl py-3"
              >
                Proses Restock
              </EnhancedButton>
            </div>
          )}
        </div>
      </Modal>

      {/* Operational Modal */}
      <Modal
        isOpen={isOperationalModalOpen}
        onClose={() => {
          setIsOperationalModalOpen(false)
          setOperationalForm({ category: "", amount: "", description: "" })
        }}
        title="Biaya Operasional"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="category" className="text-sm font-medium text-gray-700">
              Kategori Biaya *
            </Label>
            <Select
              value={operationalForm.category}
              onValueChange={(value) => setOperationalForm({ ...operationalForm, category: value })}
            >
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue placeholder="Pilih kategori biaya" />
              </SelectTrigger>
              <SelectContent>
                {operationalCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {operationalForm.category === "custom" && (
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Keterangan *
              </Label>
              <Input
                id="description"
                value={operationalForm.description}
                onChange={(e) => setOperationalForm({ ...operationalForm, description: e.target.value })}
                placeholder="Contoh: Sewa tempat, air minum, dll"
                className="mt-1 rounded-xl"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Jumlah Biaya *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={operationalForm.amount}
              onChange={(e) => setOperationalForm({ ...operationalForm, amount: e.target.value })}
              placeholder="0"
              className="mt-1 rounded-xl text-lg"
              required
            />
          </div>

          <EnhancedButton
            onClick={handleOperationalSubmit}
            disabled={
              !operationalForm.category ||
              !operationalForm.amount ||
              (operationalForm.category === "custom" && !operationalForm.description)
            }
            className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl py-3"
          >
            Simpan Biaya
          </EnhancedButton>
        </div>
      </Modal>
    </div>
  )
}
