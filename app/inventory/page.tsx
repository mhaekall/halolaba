"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { supabase, type Product } from "@/lib/supabase"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        showToast("Produk berhasil diperbarui! ✨")
      }
    } else {
      const { error } = await supabase.from("products").insert([productData])

      if (error) {
        console.error("Error adding product:", error)
      } else {
        fetchProducts()
        showToast("Produk baru berhasil ditambahkan! 🎉")
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
        showToast("Produk berhasil dihapus! 🗑️")
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
          <h1 className="text-2xl font-bold text-gray-900">Inventaris</h1>
          <p className="text-gray-600 text-sm">Kelola stok dan harga produk</p>
        </div>
        <EnhancedButton
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 rounded-2xl px-6 py-3 shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </EnhancedButton>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Cari produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-2xl border-gray-200 bg-white/70 backdrop-blur-sm"
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg text-orange-800">{lowStockProducts.length} Produk Stok Menipis</CardTitle>
            </div>
          </CardHeader>
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
              className={`bg-white/70 backdrop-blur-sm border-gray-200/50 ${
                isCriticalStock ? "border-red-300 bg-red-50/70" : isLowStock ? "border-orange-300 bg-orange-50/70" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{product.name}</CardTitle>
                    <div className="flex items-center mt-2 gap-2">
                      <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span
                        className={`text-sm font-semibold ${
                          isCriticalStock ? "text-red-600" : isLowStock ? "text-orange-600" : "text-green-600"
                        }`}
                      >
                        {product.stock}
                      </span>
                      <span className="text-xs text-gray-500">/ min: {product.minimal_stock}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <EnhancedButton size="sm" variant="outline" onClick={() => handleEdit(product)}>
                      <Edit className="h-3 w-3" />
                    </EnhancedButton>
                    <EnhancedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(product)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </EnhancedButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Harga Beli:</span>
                    <span className="text-sm font-medium">{formatCurrency(product.cost_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Harga Jual:</span>
                    <span className="text-sm font-medium">{formatCurrency(product.selling_price)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-gray-600">Laba per unit:</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(product.selling_price - product.cost_price)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "Produk tidak ditemukan" : "Belum ada produk"}
          </h3>
          <p className="text-gray-600 text-sm">
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
              className="mt-1 rounded-xl"
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
                className="mt-1 rounded-xl"
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
                className="mt-1 rounded-xl"
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
                className="mt-1 rounded-xl"
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
                className="mt-1 rounded-xl"
                required
              />
            </div>
          </div>

          {formData.cost_price && formData.selling_price && (
            <div className="p-4 bg-green-50 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Laba per unit:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.cost_price))}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-green-700">Margin:</span>
                <span className="text-sm font-semibold text-green-600">
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
            <EnhancedButton type="submit" className="flex-1 bg-green-500 hover:bg-green-600 rounded-xl py-3">
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
