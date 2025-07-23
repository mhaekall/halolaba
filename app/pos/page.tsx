"use client"

import { useEffect, useState } from "react"
import { supabase, type Product } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Plus, Minus, Trash2, Calculator } from "lucide-react"
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
        playAddToCartSound() // Add sound for adding to cart
      }
    } else {
      setCart([...cart, { product, quantity: 1 }])
      playAddToCartSound() // Add sound for new item
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
        playClickSound("light") // Add sound for quantity change
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
      // Create transaction
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

      // Create transaction items and update stock
      for (const item of cart) {
        // Add transaction item
        await supabase.from("transaction_items").insert([
          {
            transaction_id: transaction.id,
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

      // Clear cart and refresh products
      setCart([])
      fetchProducts()
      playSuccessSound()
      showToast("Transaksi berhasil diproses! 🎉")
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
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Kasir (Point of Sale)</h1>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">Proses transaksi penjualan dengan cepat</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pilih Produk</CardTitle>
              <Input
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-base"
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 lg:max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-all duration-200 active:scale-95"
                    onClick={() => addToCart(product)}
                  >
                    <h3 className="font-medium text-sm lg:text-base truncate">{product.name}</h3>
                    <p className="text-xs text-gray-600">Stok: {product.stock}</p>
                    <p className="text-base lg:text-lg font-semibold text-green-600">
                      {formatCurrency(product.selling_price)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="order-1 lg:order-2">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Keranjang ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-48 lg:max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(item.product.selling_price)} x {item.quantity}
                        </p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(item.product.selling_price * item.quantity)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-600 ml-2 active:scale-95 transition-transform"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="active:scale-95 transition-transform"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="active:scale-95 transition-transform"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Laba:</span>
                      <span>{formatCurrency(calculateProfit())}</span>
                    </div>
                  </div>
                  <Button
                    onClick={processTransaction}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 text-base py-3 active:scale-95 transition-transform"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {isProcessing ? "Memproses..." : "Proses Transaksi"}
                  </Button>
                </div>
              )}

              {cart.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">Keranjang kosong</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
