"use client"

import { useEffect, useState } from "react"
import { supabase, type Product } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Plus, Minus, Trash2, Calculator, Search } from "lucide-react"
import { playAddToCartSound, playClickSound, playSuccessSound } from "@/lib/audio"
import { useToastStore } from "@/lib/confirmation-service"

type CartItem = {
  product: Product
  quantity: number
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const { showToast } = useToastStore()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*").gt("stock", 0).order("name")

    if (error) {
      console.error("Error fetching products:", error)
    } else {
      setProducts(data || [])
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id)

    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
        playAddToCartSound()
      }
    } else {
      setCart([...cart, { product, quantity: 1 }])
      playAddToCartSound()
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter((item) => item.product.id !== productId))
      playClickSound("light")
    } else {
      const product = products.find((p) => p.id === productId)
      if (product && newQuantity <= product.stock) {
        setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity: newQuantity } : item)))
        playClickSound("light")
      }
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
    playClickSound("medium")
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.product.selling_price * item.quantity, 0)
  }

  const calculateProfit = () => {
    return cart.reduce(
      (profit, item) => profit + (item.product.selling_price - item.product.cost_price) * item.quantity,
      0,
    )
  }

  const processTransaction = async () => {
    if (cart.length === 0) return

    setIsProcessing(true)
    playClickSound("heavy")

    try {
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            total_amount: calculateTotal(),
            profit: calculateProfit(),
            type: "sale",
          },
        ])
        .select()
        .single()

      if (transactionError) throw transactionError

      for (const item of cart) {
        await supabase.from("transaction_items").insert([
          {
            transaction_id: transaction.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.selling_price,
            total_price: item.product.selling_price * item.quantity,
          },
        ])

        await supabase
          .from("products")
          .update({
            stock: item.product.stock - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product.id)
      }

      setCart([])
      fetchProducts()
      playSuccessSound()
      showToast("Transaksi berhasil diproses!")
    } catch (error) {
      console.error("Error processing transaction:", error)
      showToast("Terjadi kesalahan saat memproses transaksi")
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="p-4 pb-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Kasir</h1>
        <p className="text-gray-600">Proses transaksi penjualan dengan cepat</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-3xl shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Pilih Produk</CardTitle>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Cari produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 rounded-2xl border-gray-200 bg-gray-50 text-base h-12"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-4 hover:shadow-lg cursor-pointer active:scale-95 transition-all duration-200"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                        Stok: {product.stock}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 truncate">{product.name}</h3>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(product.selling_price)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="order-1 lg:order-2">
          <Card className="sticky top-4 bg-white/90 backdrop-blur-sm border-0 rounded-3xl shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-bold">
                <div className="p-2 bg-blue-100 rounded-xl mr-3">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                Keranjang ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-64 overflow-y-auto mb-6">
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate mb-1">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.product.selling_price)} × {item.quantity}
                        </p>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatCurrency(item.product.selling_price * item.quantity)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-600 hover:text-red-700 rounded-xl ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-center space-x-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="rounded-xl w-10 h-10 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-bold w-12 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="rounded-xl w-10 h-10 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-4">
                    <div className="flex justify-between text-xl font-bold mb-2">
                      <span>Total:</span>
                      <span className="text-emerald-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Laba:</span>
                      <span className="font-semibold">{formatCurrency(calculateProfit())}</span>
                    </div>
                  </div>
                  <Button
                    onClick={processTransaction}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl py-4 text-lg font-bold shadow-lg"
                  >
                    <Calculator className="h-5 w-5 mr-2" />
                    {isProcessing ? "Memproses..." : "Proses Transaksi"}
                  </Button>
                </div>
              )}

              {cart.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-2xl inline-block mb-4">
                    <ShoppingCart className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Keranjang kosong</p>
                  <p className="text-sm text-gray-500 mt-1">Pilih produk untuk memulai transaksi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
