"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [period, setPeriod] = useState("7")
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

      const { data: transactions } = await supabase
        .from("transactions")
        .select("total_amount, profit, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      const { data: operationalExpenses } = await supabase
        .from("operational_expenses")
        .select("amount, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      const { data: restockTransactions } = await supabase
        .from("restock_transactions")
        .select("total_amount, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      const { data: debts } = await supabase
        .from("debts")
        .select("amount, created_at")
        .gte("created_at", startDate)
        .order("created_at", { ascending: true })

      const dataByDate: { [key: string]: ReportData } = {}

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
      <div className="p-4 pt-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-3xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pt-8 pb-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Laporan Keuangan</h1>
          <p className="text-gray-600">Analisis performa bisnis Anda</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-48 rounded-2xl h-12">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <p className="text-sm opacity-90 mb-1">Total Omzet</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
              <p className="text-xs opacity-75 mt-1">{summary.totalTransactions} transaksi</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Piutang</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalReceivables)}</p>
              <p className="text-xs opacity-75 mt-1">Belum dibayar</p>
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
              <p className="text-2xl font-bold">{formatCurrency(summary.totalProfit)}</p>
              <p className="text-xs opacity-75 mt-1">Sebelum pengeluaran</p>
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">HPP (Restock)</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalHPP)}</p>
              <p className="text-xs opacity-75 mt-1">Harga Pokok Penjualan</p>
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
              <p className="text-sm opacity-90 mb-1">Biaya Operasional</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalOperationalExpenses)}</p>
              <p className="text-xs opacity-75 mt-1">Listrik, plastik, dll</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Total Pengeluaran</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalHPP + summary.totalOperationalExpenses)}
              </p>
              <p className="text-xs opacity-75 mt-1">HPP + Operasional</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Laba Bersih</p>
              <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-white" : "text-red-200"}`}>
                {formatCurrency(summary.netProfit)}
              </p>
              <p className="text-xs opacity-75 mt-1">Laba setelah pengeluaran</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 border-0 text-white rounded-3xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Total Kas</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue + summary.totalReceivables)}</p>
              <p className="text-xs opacity-75 mt-1">Omzet + Piutang</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Report */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Laporan Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.length > 0 ? (
              reportData.map((day) => (
                <div key={day.date} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{formatDate(day.date)}</h3>
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      {day.transactions} transaksi
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Omzet</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(day.revenue)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Piutang</p>
                      <p className="font-bold text-amber-600">{formatCurrency(day.receivables)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Laba Kotor</p>
                      <p className="font-bold text-blue-600">{formatCurrency(day.profit)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">HPP</p>
                      <p className="font-bold text-purple-600">{formatCurrency(day.hpp)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Biaya Operasional</p>
                      <p className="font-bold text-red-600">{formatCurrency(day.operationalExpenses)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Total Pengeluaran</p>
                      <p className="font-bold text-orange-600">{formatCurrency(day.hpp + day.operationalExpenses)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Laba Bersih</p>
                      <p
                        className={`font-bold ${(day.profit - day.operationalExpenses) >= 0 ? "text-indigo-600" : "text-red-600"}`}
                      >
                        {formatCurrency(day.profit - day.operationalExpenses)}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Total Kas</p>
                      <p className="font-bold text-teal-600">{formatCurrency(day.revenue + day.receivables)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="p-4 bg-gray-100 rounded-2xl inline-block mb-4">
                  <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Belum ada data</h3>
                <p className="text-gray-600">Data laporan akan muncul setelah ada transaksi</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
