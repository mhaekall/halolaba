"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"
import { Plus, Receipt, Trash2, Zap, Coffee, Package2, Calendar } from "lucide-react"
import { useConfirmationStore, useToastStore } from "@/lib/confirmation-service"

type OperationalExpense = {
  id: string
  description: string
  amount: number
  category: string
  created_at: string
}

const operationalCategories = [
  { id: "listrik", name: "Listrik", icon: Zap },
  { id: "kantong_plastik", name: "Kantong Plastik", icon: Package2 },
  { id: "cup", name: "Cup/Gelas", icon: Coffee },
  { id: "custom", name: "Lainnya", icon: Receipt },
]

export default function OperationalExpenses() {
  const [expenses, setExpenses] = useState<OperationalExpense[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [operationalForm, setOperationalForm] = useState({
    category: "",
    amount: "",
    description: "",
  })

  const { showConfirmation } = useConfirmationStore()
  const { showToast } = useToastStore()

  useEffect(() => {
    fetchExpenses().finally(() => setIsLoading(false))
  }, [])

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("operational_expenses")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching operational expenses:", error)
    } else {
      setExpenses(data || [])
    }
  }

  const handleOperationalSubmit = async () => {
    if (!operationalForm.category || !operationalForm.amount) return

    try {
      const categoryData = operationalCategories.find((cat) => cat.id === operationalForm.category)
      const description =
        operationalForm.category === "custom" ? operationalForm.description : `Pembayaran ${categoryData?.name}`

      const { error } = await supabase.from("operational_expenses").insert([
        {
          description,
          amount: Number.parseFloat(operationalForm.amount),
          category: categoryData?.name || "Lainnya",
        },
      ])

      if (error) throw error

      setOperationalForm({ category: "", amount: "", description: "" })
      setIsModalOpen(false)
      fetchExpenses()
      showToast("Biaya operasional berhasil ditambahkan! 💰")
    } catch (error) {
      console.error("Error adding operational expense:", error)
    }
  }

  const handleDelete = async (expense: OperationalExpense) => {
    const confirmed = await showConfirmation({
      title: "Hapus Pengeluaran",
      message: `Yakin ingin menghapus pengeluaran "${expense.description}" sebesar ${formatCurrency(expense.amount)}?`,
      type: "danger",
      confirmText: "Hapus",
      cancelText: "Batal",
    })

    if (confirmed) {
      const { error } = await supabase.from("operational_expenses").delete().eq("id", expense.id)

      if (error) {
        console.error("Error deleting expense:", error)
      } else {
        fetchExpenses()
        showToast("Pengeluaran berhasil dihapus! 🗑️")
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

  const filteredExpenses = expenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  const totalOperationalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const getCategoryIcon = (category: string) => {
    const categoryData = operationalCategories.find((cat) => cat.name === category)
    return categoryData?.icon || Receipt
  }

  if (isLoading) {
    return (
      <div className="p-4 pt-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Biaya Operasional</h1>
          <p className="text-gray-600 text-sm">Kelola biaya operasional warung</p>
        </div>
        <EnhancedButton
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 rounded-2xl px-6 py-3 shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </EnhancedButton>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-r from-orange-500 to-orange-600 border-0 text-white">
        <CardHeader>
          <CardTitle className="text-lg opacity-90">Total Biaya Operasional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalOperationalAmount)}</p>
              <p className="text-sm opacity-75">{filteredExpenses.length} pembayaran</p>
            </div>
            <Receipt className="h-12 w-12 opacity-20" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Receipt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Cari pengeluaran..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-2xl border-gray-200 bg-white/70 backdrop-blur-sm"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {operationalCategories.map((category) => {
          const CategoryIcon = category.icon
          return (
            <EnhancedButton
              key={category.id}
              variant="outline"
              size="sm"
              onClick={() => setSearchTerm(category.name)}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              <CategoryIcon className="h-3 w-3" />
              {category.name}
            </EnhancedButton>
          )
        })}
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        {filteredExpenses.map((expense) => {
          const CategoryIcon = getCategoryIcon(expense.category)
          return (
            <Card key={expense.id} className="bg-white/70 backdrop-blur-sm border-gray-200/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-orange-100">
                    <CategoryIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                        {expense.category}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{expense.description}</h3>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(expense.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                    </div>
                    <EnhancedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(expense)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </EnhancedButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada biaya operasional</h3>
          <p className="text-gray-600 text-sm">Mulai dengan mencatat pengeluaran pertama Anda</p>
        </div>
      )}

      {/* Operational Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setOperationalForm({ category: "", amount: "", description: "" })
        }}
        title="Tambah Biaya Operasional"
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
