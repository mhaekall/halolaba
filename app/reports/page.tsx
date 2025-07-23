"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, DollarSign, ShoppingCart, Calendar, Package, Receipt, Users } from "lucide-react"

type ReportData = {
  date: string
  revenue: number
  profit: number
  transactions: number
  operationalExpenses: number
  hpp: number
  receivables: number
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [period, setPeriod] = useState("7") // days
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    totalOperationalExpenses: 0,
    totalHPP: 0,
    totalReceivables: 0,
    netProfit: 0,
  })

  useEffect(() => {
    fetchReportData()
  }, [period])

  const fetchReportData = async () => {
    setIsLoading(true)
    try {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - Number.parseInt(period))
      const startDate = daysAgo.toISOString().split("T")[0]

      // Get transactions data
      const { data: transactions } = await supabase
        .from("transactions")
        .select("total_amount, profit, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      // Get operational expenses data
      const { data: operationalExpenses } = await supabase
        .from("operational_expenses")
        .select("amount, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      // Get restock transactions (HPP) data
      const { data: restockTransactions } = await supabase
        .from("restock_transactions")
        .select("total_amount, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      // Get debts (receivables) data
      const { data: debts } = await supabase
        .from("debts")
        .select("amount, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      // Group data by date
      const dataByDate: { [key: string]: ReportData } = {}

      // Process transactions
      transactions?.forEach((transaction) => {
        const date = transaction.created_at.split("T")[0]
        if (!dataByDate[date]) {
          dataByDate[date] = {
            date,
            revenue: 0,
            profit: 0,
            transactions: 0,
            operationalExpenses: 0,
            hpp: 0,
            receivables: 0,
          }
        }
        dataByDate[date].revenue += transaction.total_amount
        dataByDate[date].profit += transaction.profit
        dataByDate[date].transactions += 1
      })

      // Process operational expenses
      operationalExpenses?.forEach((expense) => {
        const date = expense.created_at.split("T")[0]
        if (!dataByDate[date]) {
          dataByDate[date] = {
            date,
            revenue: 0,
            profit: 0,
            transactions: 0,
            operationalExpenses: 0,
            hpp: 0,
            receivables: 0,
          }
        }
        dataByDate[date].operationalExpenses += expense.amount
      })

      // Process restock transactions (HPP)
      restockTransactions?.forEach((restock) => {
        const date = restock.created_at.split("T")[0]
        if (!dataByDate[date]) {
          dataByDate[date] = {
            date,
            revenue: 0,
            profit: 0,
            transactions: 0,
            operationalExpenses: 0,
            hpp: 0,
            receivables: 0,
          }
        }
        dataByDate[date].hpp += restock.total_amount
      })

      // Process debts (receivables)
      debts?.forEach((debt) => {
        const date = debt.created_at.split("T")[0]
        if (!dataByDate[date]) {
          dataByDate[date] = {
            date,
            revenue: 0,
            profit: 0,
            transactions: 0,
            operationalExpenses: 0,
            hpp: 0,
            receivables: 0,
          }
        }
        dataByDate[date].receivables += debt.amount
      })

      const reportArray = Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date))
      setReportData(reportArray)

      // Calculate summary
      const totalRevenue = reportArray.reduce((sum, day) => sum + day.revenue, 0)
      const totalProfit = reportArray.reduce((sum, day) => sum + day.profit, 0)
      const totalTransactions = reportArray.reduce((sum, day) => sum + day.transactions, 0)
      const totalOperationalExpenses = reportArray.reduce((sum, day) => sum + day.operationalExpenses, 0)
      const totalHPP = reportArray.reduce((sum, day) => sum + day.hpp, 0)
      const totalReceivables = reportArray.reduce((sum, day) => sum + day.receivables, 0)
      const netProfit = totalProfit - totalOperationalExpenses

      setSummary({
        totalRevenue,
        totalProfit,
        totalTransactions,
        totalOperationalExpenses,
        totalHPP,
        totalReceivables,
        netProfit,
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setIsLoading(false)
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
    })
  }

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">Analisis performa bisnis Anda</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 Hari Terakhir</SelectItem>
            <SelectItem value="30">30 Hari Terakhir</SelectItem>
            <SelectItem value="90">3 Bulan Terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Omzet</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-gray-600 mt-1">{summary.totalTransactions} transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Piutang</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-amber-600">
              {formatCurrency(summary.totalReceivables)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Belum dibayar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-blue-600">{formatCurrency(summary.totalProfit)}</div>
            <p className="text-xs text-gray-600 mt-1">Sebelum pengeluaran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HPP (Restock)</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-purple-600">{formatCurrency(summary.totalHPP)}</div>
            <p className="text-xs text-gray-600 mt-1">Harga Pokok Penjualan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biaya Operasional</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalOperationalExpenses)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Listrik, plastik, dll</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalHPP + summary.totalOperationalExpenses)}
            </div>
            <p className="text-xs text-gray-600 mt-1">HPP + Operasional</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl lg:text-2xl font-bold ${summary.netProfit >= 0 ? "text-indigo-600" : "text-red-600"}`}
            >
              {formatCurrency(summary.netProfit)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Laba setelah pengeluaran</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kas</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.totalRevenue + summary.totalReceivables)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Omzet + Piutang</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Laporan Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.length > 0 ? (
              reportData.map((day) => (
                <div key={day.date} className="border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                    <h3 className="font-semibold text-gray-900">{formatDate(day.date)}</h3>
                    <span className="text-sm text-gray-600">{day.transactions} transaksi</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Omzet</p>
                      <p className="font-semibold text-green-600">{formatCurrency(day.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Piutang</p>
                      <p className="font-semibold text-amber-600">{formatCurrency(day.receivables)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Laba Kotor</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(day.profit)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">HPP</p>
                      <p className="font-semibold text-purple-600">{formatCurrency(day.hpp)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Biaya Operasional</p>
                      <p className="font-semibold text-red-600">{formatCurrency(day.operationalExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Pengeluaran</p>
                      <p className="font-semibold text-orange-600">
                        {formatCurrency(day.hpp + day.operationalExpenses)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Laba Bersih</p>
                      <p
                        className={`font-semibold ${(day.profit - day.operationalExpenses) >= 0 ? "text-indigo-600" : "text-red-600"}`}
                      >
                        {formatCurrency(day.profit - day.operationalExpenses)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Kas</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(day.revenue + day.receivables)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada data</h3>
                <p className="text-gray-600 text-sm">Data laporan akan muncul setelah ada transaksi</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
