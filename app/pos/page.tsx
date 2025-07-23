"use client"

import { useEffect, useState } from "react"
import { supabase, type Product } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { playAddToCartSound, playClickSound, playSuccessSound } from "@/lib/audio"
import { useToastStore } from "@/lib/confirmation-service"

type CartItem = {
  product: Product
  quantity: number
}

type Step = "products" | "confirmation" | "completion"

export default function POS() {
  const [currentStep, setCurrentStep] = useState<Step>("products")
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionId, setTransactionId] = useState<string>("")

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

      setTransactionId(transaction.id)
      setCurrentStep("completion")
      fetchProducts()
      playSuccessSound()

      // Auto reset after 3 seconds
      setTimeout(() => {
        setCart([])
        setCurrentStep("products")
        setTransactionId("")
      }, 3000)
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

  const goToConfirmation = () => {
    if (cart.length > 0) {
      setCurrentStep("confirmation")
      playClickSound("medium")
    }
  }

  const goBackToProducts = () => {
    setCurrentStep("products")
    playClickSound("light")
  }

  const getProductQuantityInCart = (productId: string) => {
    const cartItem = cart.find((item) => item.product.id === productId)
    return cartItem ? cartItem.quantity : 0
  }

  // Step 1: Product Selection
  if (currentStep === "products") {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center mb-2">
            <div className="p-2 bg-blue-100 rounded-xl mr-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pilih Produk</h1>
              <p className="text-gray-600 text-sm">Langkah 1 dari 3</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-blue-600 h-2 rounded-full w-1/3 transition-all duration-300"></div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-gray-200 bg-white text-sm h-12"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 pt-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 pb-4">
            {filteredProducts.map((product) => {
              const quantityInCart = getProductQuantityInCart(product.id)

              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg cursor-pointer active:scale-95 transition-all duration-200 min-h-[160px] flex flex-col relative"
                  onClick={() => addToCart(product)}
                >
                  {/* Quantity Badge */}
                  {quantityInCart > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
                      {quantityInCart}
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-emerald-100 rounded-xl flex-shrink-0">
                      <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1 text-sm leading-tight break-words">{product.name}</h3>
                      {product.category && <p className="text-xs text-gray-500 mb-2">{product.category}</p>}
                    </div>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(product.selling_price)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cart Summary & Continue Button */}
        {cart.length > 0 && (
          <div className="p-4 pt-0 pb-24">
            <Card className="bg-white border-0 rounded-2xl shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0L5.4 5M7 13h10m-10 0l-1.5 6m1.5-6h10m0 0l1.5 6M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6"
                      />
                    </svg>
                    <span className="font-bold text-gray-900">{cart.length} item dipilih</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(calculateTotal())}</span>
                </div>
                <Button
                  onClick={goToConfirmation}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl py-3 text-base font-bold"
                >
                  Lanjut ke Pembayaran
                  <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // Step 2: Payment Confirmation
  if (currentStep === "confirmation") {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center mb-2">
            <Button variant="ghost" size="sm" onClick={goBackToProducts} className="mr-2 p-2 rounded-xl">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <div className="p-2 bg-emerald-100 rounded-xl mr-3">
              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Konfirmasi Pembayaran</h1>
              <p className="text-gray-600 text-sm">Langkah 2 dari 3</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-emerald-600 h-2 rounded-full w-2/3 transition-all duration-300"></div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="flex-1 p-4 pt-2 overflow-y-auto">
          <Card className="bg-white border-0 rounded-2xl shadow-sm mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold">
                <svg className="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Ringkasan Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{item.product.name}</h4>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.product.selling_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(item.product.selling_price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-0 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(calculateTotal())}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Laba</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(calculateProfit())}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Process Payment Button */}
        <div className="p-4 pb-24">
          <Button
            onClick={processTransaction}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl py-4 text-lg font-bold shadow-lg"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Memproses Pembayaran...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Proses Pembayaran
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: Payment Completion
  if (currentStep === "completion") {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-emerald-50 to-green-50">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center mb-2">
            <div className="p-2 bg-green-100 rounded-xl mr-3">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pembayaran Selesai</h1>
              <p className="text-gray-600 text-sm">Langkah 3 dari 3</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-green-600 h-2 rounded-full w-full transition-all duration-300"></div>
          </div>
        </div>

        {/* Success Animation */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            {/* Animated Success Icon */}
            <div className="relative mb-6">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <svg
                  className="h-16 w-16 text-green-600 animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              {/* Ripple Effect */}
              <div className="absolute inset-0 w-32 h-32 bg-green-200 rounded-full mx-auto animate-ping opacity-20"></div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">Transaksi Berhasil!</h2>
            <p className="text-gray-600 mb-6">Pembayaran telah diproses dengan sukses</p>

            {/* Transaction Details */}
            <Card className="bg-white border-0 rounded-2xl shadow-lg max-w-sm mx-auto">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    <span className="text-lg font-bold text-gray-900">Struk Pembayaran</span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">ID Transaksi</span>
                      <span className="font-mono text-sm">{transactionId.slice(-8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Total Item</span>
                      <span className="font-medium">{cart.length} item</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Total Bayar</span>
                      <span className="font-bold text-green-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Waktu</span>
                      <span className="font-medium">{new Date().toLocaleTimeString("id-ID")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-gray-500 mt-6">Kembali ke halaman produk dalam 3 detik...</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
