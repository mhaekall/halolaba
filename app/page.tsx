"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedButton } from "@/components/ui/enhanced-button"

export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    criticalStockProducts: 0,
    todayRevenue: 0,
    todayProfit: 0,
    unpaidDebts: 0,
    todayTransactions: 0,
    totalOperationalExpenses: 0,
    totalRestockExpenses: 0,
  })

  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [slowProducts, setSlowProducts] = useState<any[]>([])

  useEffect(() => {
    Promise.all([fetchStats(), fetchLowStockItems(), fetchProductAnalytics()]).finally(() => setIsLoading(false))
  }, [])

  const fetchStats = async () => {
    try {
      // Get total products
      const { count: totalProducts } = await supabase.from("products").select("*", { count: "exact", head: true })

      // Get low stock products (stock <= minimal_stock)
      const { data: products } = await supabase.from("products").select("stock, minimal_stock")
      const lowStockProducts = products?.filter((p) => p.stock <= p.minimal_stock).length || 0
      const criticalStockProducts = products?.filter((p) => p.stock < p.minimal_stock / 2).length || 0

      // Get today's revenue and profit
      const today = new Date().toISOString().split("T")[0]
      const { data: todayTransactions } = await supabase
        .from("transactions")
        .select("total_amount, profit")
        .gte("created_at", today)
        .lt("created_at", `${today}T23:59:59`)

      const todayRevenue = todayTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
      const todayProfit = todayTransactions?.reduce((sum, t) => sum + t.profit, 0) || 0

      // Get unpaid debts
      const { data: unpaidDebts } = await supabase.from("debts").select("amount").eq("status", "unpaid")
      const totalUnpaidDebts = unpaidDebts?.reduce((sum, d) => sum + d.amount, 0) || 0

      // Get operational expenses
      const { data: operationalExpenses } = await supabase.from("operational_expenses").select("amount")
      const totalOperationalExpenses = operationalExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0

      // Get restock expenses
      const { data: restockTransactions } = await supabase.from("restock_transactions").select("total_amount")
      const totalRestockExpenses = restockTransactions?.reduce((sum, r) => sum + r.total_amount, 0) || 0

      setStats({
        totalProducts: totalProducts || 0,
        lowStockProducts,
        criticalStockProducts,
        todayRevenue,
        todayProfit,
        unpaidDebts: totalUnpaidDebts,
        todayTransactions: todayTransactions?.length || 0,
        totalOperationalExpenses,
        totalRestockExpenses,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchLowStockItems = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("name, stock, minimal_stock")
        .lte("stock", 10)
        .order("stock", { ascending: true })
        .limit(10)

      setLowStockItems(data || [])
    } catch (error) {
      console.error("Error fetching low stock items:", error)
    }
  }

  const fetchProductAnalytics = async () => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: transactionItems } = await supabase
        .from("transaction_items")
        .select(`
          quantity,
          products (
            id,
            name
          ),
          transactions!inner (
            created_at
          )
        `)
        .gte("transactions.created_at", thirtyDaysAgo.toISOString())

      if (transactionItems) {
        const productSales: { [key: string]: { name: string; totalSold: number } } = {}

        transactionItems.forEach((item: any) => {
          if (item.products) {
            const productId = item.products.id
            if (!productSales[productId]) {
              productSales[productId] = {
                name: item.products.name,
                totalSold: 0,
              }
            }
            productSales[productId].totalSold += item.quantity
          }
        })

        const sortedProducts = Object.values(productSales).sort((a, b) => b.totalSold - a.totalSold)

        setTopProducts(sortedProducts.slice(0, 5))
        setSlowProducts(sortedProducts.slice(-3).reverse())
      }
    } catch (error) {
      console.error("Error fetching product analytics:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="p-4 pt-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-3xl"></div>
            ))}
          </div>
          <div className="h-40 bg-gray-200 rounded-3xl mb-6"></div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const netProfit = stats.todayProfit - stats.totalOperationalExpenses

  return (
    <div className="p-4 pt-8 pb-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Selamat datang kembali! Berikut ringkasan bisnis Anda hari ini.</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Omzet Hari Ini</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</p>
              <p className="text-xs opacity-75 mt-1">{stats.todayTransactions} transaksi</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Laba Kotor</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.todayProfit)}</p>
              <p className="text-xs opacity-75 mt-1">Sebelum pengeluaran</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Total Pengeluaran</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalOperationalExpenses)}</p>
              <p className="text-xs opacity-75 mt-1">Biaya operasional</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Laba Bersih</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-white" : "text-red-200"}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className="text-xs opacity-75 mt-1">Laba setelah pengeluaran</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="mb-8 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-2xl">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-orange-800">Peringatan Stok</h3>
                <p className="text-orange-700 text-sm">{lowStockItems.length} produk memerlukan perhatian</p>
              </div>
            </div>
            <div className="space-y-3">
              {lowStockItems.slice(0, 3).map((item, index) => {
                const isVeryLow = item.stock <= item.minimal_stock
                const isCritical = item.stock < item.minimal_stock / 2

                return (
                  <div key={index} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${isCritical ? "bg-red-500" : isVeryLow ? "bg-orange-500" : "bg-yellow-500"}`}
                      />
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${isCritical ? "text-red-600" : isVeryLow ? "text-orange-600" : "text-yellow-600"}`}
                      >
                        {item.stock}
                      </span>
                      <span className="text-gray-500 text-sm">/{item.minimal_stock}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-3xl shadow-lg mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Aksi Cepat</h3>
          <div className="grid grid-cols-2 gap-4">
            <EnhancedButton
              onClick={() => router.push("/inventory")}
              className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl text-white h-auto flex flex-col items-center shadow-lg"
            >
              <div className="p-3 bg-white/20 rounded-2xl mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="font-bold text-sm">Kelola Stok</p>
              <p className="text-xs opacity-75 text-center">Inventaris produk</p>
            </EnhancedButton>

            <EnhancedButton
              onClick={() => router.push("/operational")}
              className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl text-white h-auto flex flex-col items-center shadow-lg"
            >
              <div className="p-3 bg-white/20 rounded-2xl mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="font-bold text-sm">Biaya Operasional</p>
              <p className="text-xs opacity-75 text-center">Catat pengeluaran</p>
            </EnhancedButton>

            <EnhancedButton
              onClick={() => router.push("/debts")}
              className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl text-white h-auto flex flex-col items-center shadow-lg"
            >
              <div className="p-3 bg-white/20 rounded-2xl mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="font-bold text-sm">Piutang</p>
              <p className="text-xs opacity-75 text-center">Kelola kasbon</p>
            </EnhancedButton>

            <EnhancedButton
              onClick={() => router.push("/restock")}
              className="p-6 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-3xl text-white h-auto flex flex-col items-center shadow-lg"
            >
              <div className="p-3 bg-white/20 rounded-2xl mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <p className="font-bold text-sm">Restock Barang</p>
              <p className="text-xs opacity-75 text-center">Belanja stok (HPP)</p>
            </EnhancedButton>
          </div>
        </CardContent>
      </Card>

      {/* Product Analytics */}
      {(topProducts.length > 0 || slowProducts.length > 0) && (
        <div className="grid grid-cols-1 gap-6">
          {/* Top Products */}
          {topProducts.length > 0 && (
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 rounded-3xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-100 rounded-2xl">
                    <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-800">Produk Terlaris</h3>
                    <p className="text-emerald-700 text-sm">30 hari terakhir</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {topProducts.slice(0, 3).map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-emerald-600 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                      <span className="text-emerald-600 font-bold">{product.totalSold} terjual</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slow Products */}
          {slowProducts.length > 0 && (
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 rounded-3xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-100 rounded-2xl">
                    <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-800">Produk Kurang Laku</h3>
                    <p className="text-amber-700 text-sm">Perlu perhatian khusus</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {slowProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm">
                      <span className="font-medium text-gray-900">{product.name}</span>
                      <span className="text-amber-600 font-bold">{product.totalSold} terjual</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
