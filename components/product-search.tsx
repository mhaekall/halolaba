"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Search, Plus } from "lucide-react"
import type { Product } from "@/lib/supabase"

interface ProductSearchProps {
  products: Product[]
  onSelectProduct: (product: Product) => void
  selectedProducts?: string[]
  placeholder?: string
  showStock?: boolean
  showPrice?: boolean
}

export function ProductSearch({
  products,
  onSelectProduct,
  selectedProducts = [],
  placeholder = "Cari produk...",
  showStock = true,
  showPrice = true,
}: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedProducts.includes(product.id),
      )
      .slice(0, 20) // Limit to 20 results for performance
  }, [products, searchTerm, selectedProducts])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
        {filteredProducts.map((product) => (
          <EnhancedButton
            key={product.id}
            onClick={() => onSelectProduct(product)}
            variant="outline"
            className="p-3 text-left justify-between rounded-xl h-auto"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{product.name}</p>
              <div className="flex gap-4 text-xs text-gray-600 mt-1">
                {showStock && <span>Stok: {product.stock}</span>}
                {showPrice && <span>{formatCurrency(product.selling_price)}</span>}
              </div>
            </div>
            <Plus className="h-4 w-4 flex-shrink-0" />
          </EnhancedButton>
        ))}

        {filteredProducts.length === 0 && searchTerm && (
          <div className="text-center py-4 text-gray-500 text-sm">Produk tidak ditemukan</div>
        )}
      </div>
    </div>
  )
}
