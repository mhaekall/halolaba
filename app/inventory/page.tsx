"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { supabase, type Product } from "@/lib/supabase"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/ui/modal"
import { Plus, Edit, Trash2, Package, Search, AlertTriangle } from "lucide-react"
import { useConfirmationStore, useToastStore } from "@/lib/confirmation-service"

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    stock: "",
    minimal_stock: "",
    cost_price: "",
    selling_price: "",
  })

  const { showConfirmation } = useConfirmationStore()
  const { showToast } = useToastStore()

  useEffect(() => {
    fetchProducts().finally(() => setIsLoading(false))
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").order("name")

    if (error) {
      console.error("Error fetching products:", error)
    } else {
      setProducts(data || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const productData = {
      name: formData.name,
      stock: Number.parseInt(formData.stock),
      minimal_stock: Number.parseInt(formData.minimal_stock),
      cost_price: Number.parseFloat(formData.cost_price),
      selling_price: Number.parseFloat(formData.selling_price),
    }

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq("id", editingProduct.id)

      if (error) {
        console.error("Error updating product:", error)
      } else {
        setEditingProduct(null)
        fetchProducts()
        showToast("Produk berhasil diperbarui!")
      }
    } else {
      const { error } = await supabase.from("products").insert([productData])

      if (error) {
        console.error("Error adding product:", error)
      } else {
        fetchProducts()
        showToast("Produk baru berhasil ditambahkan!")
      }
    }

    setIsModalOpen(false)
    setFormData({ name: "", stock: "", minimal_stock: "", cost_price: "", selling_price: "" })
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      stock: product.stock.toString(),
      minimal_stock: product.minimal_stock.toString(),
      cost_price: product.cost_price.toString(),
      selling_price: product.selling_price.toString(),
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (product: Product) => {
    const confirmed = await showConfirmation({
      title: "Hapus Produk",
      message: `Yakin ingin menghapus "${product.name}"? Tindakan ini tidak dapat dibatalkan.`,
      type: "danger",
      confirmText: "Hapus",
      cancelText: "Batal",
    })

    if (confirmed) {
      const { error } = await supabase.from("products").delete().eq("id", product.id)

      if (error) {
        console.error("Error deleting product:", error)
      } else {
        fetchProducts()
        showToast("Produk berhasil dihapus!")
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

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const lowStockProducts = products.filter((product) => product.stock <= product.minimal_stock)

  if (isLoading) {
    return (
      <div className="p-4 pt-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pt-8 pb-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventaris</h1>
          <p className="text-gray-600">Kelola stok dan harga produk</p>
        </div>
        <EnhancedButton
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl px-6 py-3 shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </EnhancedButton>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          placeholder="Cari produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 rounded-2xl border-gray-200 bg-white/70 backdrop-blur-sm h-12"
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-orange-800">Stok Menipis</h3>
                <p className="text-orange-700">{lowStockProducts.length} produk memerlukan perhatian</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredProducts.map((product) => {
          const isLowStock = product.stock <= product.minimal_stock
          const isCriticalStock = product.stock < product.minimal_stock / 2

          return (
            <Card
              key={product.id}
              className={`bg-white/80 backdrop-blur-sm border-0 rounded-3xl shadow-lg ${
                isCriticalStock ? "ring-2 ring-red-200" : isLowStock ? "ring-2 ring-orange-200" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-sm font-bold ${
                              isCriticalStock ? "text-red-600" : isLowStock ? "text-orange-600" : "text-green-600"
                            }`}
                          >
                            {product.stock}
                          </span>
                          <span className="text-xs text-gray-500">/ min: {product.minimal_stock}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <EnhancedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                    </EnhancedButton>
                    <EnhancedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(product)}
                      className="text-red-600 hover:text-red-700 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </EnhancedButton>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Harga Beli:</span>
                      <span className="text-sm font-bold">{formatCurrency(product.cost_price)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Harga Jual:</span>
                      <span className="text-sm font-bold">{formatCurrency(product.selling_price)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-sm font-medium text-gray-700">Laba per unit:</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {formatCurrency(product.selling_price - product.cost_price)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <div className="p-4 bg-gray-100 rounded-2xl inline-block mb-4">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchTerm ? "Produk tidak ditemukan" : "Belum ada produk"}
          </h3>
          <p className="text-gray-600">
            {searchTerm ? "Coba kata kunci lain" : "Mulai dengan menambahkan produk pertama Anda"}
          </p>
        </div>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingProduct(null)
          setFormData({ name: "", stock: "", minimal_stock: "", cost_price: "", selling_price: "" })
        }}
        title={editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nama Produk *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Beras Premium 5kg"
              className="mt-2 rounded-2xl h-12"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock" className="text-sm font-medium text-gray-700">
                Stok Saat Ini *
              </Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                className="mt-2 rounded-2xl h-12"
                required
              />
            </div>
            <div>
              <Label htmlFor="minimal_stock" className="text-sm font-medium text-gray-700">
                Stok Minimal *
              </Label>
              <Input
                id="minimal_stock"
                type="number"
                value={formData.minimal_stock}
                onChange={(e) => setFormData({ ...formData, minimal_stock: e.target.value })}
                placeholder="5"
                className="mt-2 rounded-2xl h-12"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Peringatan akan muncul jika stok ≤ nilai ini</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost_price" className="text-sm font-medium text-gray-700">
                Harga Beli (Modal) *
              </Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="0"
                className="mt-2 rounded-2xl h-12"
                required
              />
            </div>
            <div>
              <Label htmlFor="selling_price" className="text-sm font-medium text-gray-700">
                Harga Jual *
              </Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                placeholder="0"
                className="mt-2 rounded-2xl h-12"
                required
              />
            </div>
          </div>

          {formData.cost_price && formData.selling_price && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-emerald-800">Laba per unit:</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.cost_price))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-700">Margin:</span>
                <span className="text-sm font-bold text-emerald-600">
                  {(
                    ((Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.cost_price)) /
                      Number.parseFloat(formData.selling_price)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <EnhancedButton
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-2xl py-3"
            >
              {editingProduct ? "Update Produk" : "Simpan Produk"}
            </EnhancedButton>
            <EnhancedButton
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setEditingProduct(null)
                setFormData({ name: "", stock: "", minimal_stock: "", cost_price: "", selling_price: "" })
              }}
              className="flex-1 rounded-2xl py-3"
            >
              Batal
            </EnhancedButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
