"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        .lte("stock", 10) // Show products with stock <= 10
        .order("stock", { ascending: true })
        .limit(10)

      setLowStockItems(data || [])
    } catch (error) {
      console.error("Error fetching low stock items:", error)
    }
  }

  const fetchProductAnalytics = async () => {
    try {
      // Get last 30 days transaction items with product info
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
        // Group by product and sum quantities
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

        // Convert to array and sort
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
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Calculate net profit
  const netProfit = stats.todayProfit - stats.totalOperationalExpenses

  return (
    <div className="p-4 pt-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Omzet Hari Ini</CardTitle>
              <svg className="h-4 w-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs opacity-75 mt-1">{stats.todayTransactions} transaksi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Laba Kotor</CardTitle>
              <svg className="h-4 w-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.todayProfit)}</div>
            <p className="text-xs opacity-75 mt-1">Sebelum pengeluaran</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-0 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Total Pengeluaran</CardTitle>
              <svg className="h-4 w-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.totalOperationalExpenses)}</div>
            <p className="text-xs opacity-75 mt-1">Biaya operasional</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Laba Bersih</CardTitle>
              <svg className="h-4 w-4 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${netProfit >= 0 ? "text-white" : "text-red-200"}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs opacity-75 mt-1">Laba setelah pengeluaran</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <CardTitle className="text-lg text-orange-800">Peringatan Stok Menipis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-3 text-sm">{lowStockItems.length} produk memerlukan perhatian</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lowStockItems.map((item, index) => {
                const isVeryLow = item.stock <= item.minimal_stock
                const isCritical = item.stock < item.minimal_stock / 2

                return (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      isCritical
                        ? "bg-red-100 border border-red-200"
                        : isVeryLow
                          ? "bg-orange-100 border border-orange-200"
                          : "bg-yellow-100 border border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCritical && <span className="text-red-600">🚨</span>}
                      {isVeryLow && !isCritical && <span className="text-orange-600">⚠️</span>}
                      {!isVeryLow && <span className="text-yellow-600">⚡</span>}
                      <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold text-sm ${
                          isCritical ? "text-red-600" : isVeryLow ? "text-orange-600" : "text-yellow-600"
                        }`}
                      >
                        {item.stock}
                      </span>
                      <span className="text-gray-500 text-xs">/{item.minimal_stock}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <EnhancedButton
              onClick={() => router.push("/inventory")}
              className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white h-auto flex flex-col items-start"
            >
              <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="font-semibold text-sm">Kelola Stok</p>
              <p className="text-xs opacity-75">Inventaris produk</p>
            </EnhancedButton>

            <EnhancedButton
              onClick={() => router.push("/operational")}
              className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl text-white h-auto flex flex-col items-start"
            >
              <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="font-semibold text-sm">Biaya Operasional</p>
              <p className="text-xs opacity-75">Catat pengeluaran</p>
            </EnhancedButton>

            <EnhancedButton
              onClick={() => router.push("/debts")}
              className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white h-auto flex flex-col items-start"
            >
              <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="font-semibold text-sm">Piutang</p>
              <p className="text-xs opacity-75">Kelola kasbon</p>
            </EnhancedButton>

            <EnhancedButton
              onClick={() => router.push("/restock")}
              className="p-4 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl text-white h-auto flex flex-col items-start"
            >
              <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="font-semibold text-sm">Restock Barang</p>
              <p className="text-xs opacity-75">Belanja stok (HPP)</p>
            </EnhancedButton>

            <EnhancedButton
              onClick={() => router.push("/guide")}
              className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl text-white h-auto flex flex-col items-start"
            >
              <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <p className="font-semibold text-sm">Panduan</p>
              <p className="text-xs opacity-75">Belajar fitur app</p>
            </EnhancedButton>
          </div>
        </CardContent>
      </Card>

      {/* Product Analytics */}
      {(topProducts.length > 0 || slowProducts.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Top Products */}
          {topProducts.length > 0 && (
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  <CardTitle className="text-lg text-emerald-800">Produk Terlaris</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topProducts.slice(0, 3).map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold text-sm">#{index + 1}</span>
                        <span className="font-medium text-gray-900 text-sm">{product.name}</span>
                      </div>
                      <span className="text-emerald-600 font-bold text-sm">{product.totalSold} terjual</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slow Products */}
          {slowProducts.length > 0 && (
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                  <CardTitle className="text-lg text-amber-800">Produk Kurang Laku</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {slowProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white rounded-lg">
                      <span className="font-medium text-gray-900 text-sm">{product.name}</span>
                      <span className="text-amber-600 font-bold text-sm">{product.totalSold} terjual</span>
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
