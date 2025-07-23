"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  ShoppingCart,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Target,
  BarChart3,
  Receipt,
} from "lucide-react"

export default function Guide() {
  const router = useRouter()

  const features = [
    {
      icon: ShoppingCart,
      title: "Kasir (POS)",
      description: "Sistem point of sale untuk transaksi penjualan",
      tips: [
        "Pilih produk dengan tap/klik",
        "Atur jumlah dengan tombol +/-",
        "Cek total dan laba sebelum proses",
        "Stok otomatis berkurang setelah transaksi",
      ],
      color: "blue",
    },
    {
      icon: Package,
      title: "Kelola Stok",
      description: "Manajemen inventaris dan harga produk",
      tips: [
        "Set stok minimal untuk peringatan otomatis",
        "Hitung margin keuntungan dengan tepat",
        "Update harga secara berkala",
        "Monitor produk yang hampir habis",
      ],
      color: "green",
    },
    {
      icon: Receipt,
      title: "Pengeluaran",
      description: "Catat restock barang dan biaya operasional",
      tips: [
        "Restock barang untuk menambah stok",
        "Catat biaya operasional (listrik, plastik, dll)",
        "Pisahkan antara restock dan biaya operasional",
        "Monitor total pengeluaran bulanan",
      ],
      color: "orange",
    },
    {
      icon: TrendingUp,
      title: "Laporan",
      description: "Analisis performa bisnis dan keuangan",
      tips: [
        "Cek omzet dan laba harian",
        "Bandingkan performa periode berbeda",
        "Identifikasi tren penjualan",
        "Hitung laba bersih setelah biaya",
      ],
      color: "purple",
    },
    {
      icon: Users,
      title: "Piutang",
      description: "Kelola hutang pelanggan (kasbon)",
      tips: [
        "Pilih produk yang dikasbon seperti di kasir",
        "Stok otomatis berkurang saat buat piutang",
        "Update status pembayaran saat lunas",
        "Monitor total piutang aktif",
      ],
      color: "amber",
    },
  ]

  const concepts = [
    {
      icon: DollarSign,
      title: "Omzet vs Laba",
      content:
        "Omzet = total penjualan. Laba = omzet - harga pokok penjualan (HPP). HPP dihitung saat barang terjual, bukan saat beli stok.",
    },
    {
      icon: BarChart3,
      title: "Analisis Produk",
      content:
        "Pantau produk terlaris untuk fokus promosi. Identifikasi produk kurang laku untuk evaluasi atau ganti dengan yang lebih diminati.",
    },
    {
      icon: AlertTriangle,
      title: "Manajemen Stok",
      content:
        "Set stok minimal yang realistis. Stok terlalu banyak = modal tertahan. Stok terlalu sedikit = kehilangan penjualan.",
    },
    {
      icon: Target,
      title: "Margin Keuntungan",
      content:
        "Hitung margin yang kompetitif tapi menguntungkan. Pertimbangkan biaya operasional seperti listrik, plastik, dll.",
    },
    {
      icon: Receipt,
      title: "Restock vs Biaya Operasional",
      content:
        "Restock = beli barang untuk dijual (aset). Biaya operasional = listrik, plastik, cup (beban). Keduanya berbeda dalam akuntansi.",
    },
    {
      icon: Users,
      title: "Sistem Piutang",
      content:
        "Piutang dibuat seperti transaksi kasir. Pilih produk dan jumlah, stok langsung berkurang. Saat lunas, hanya update status pembayaran.",
    },
  ]

  return (
    <div className="p-4 pt-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500 rounded-2xl">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panduan HaloLaba</h1>
            <p className="text-gray-600 text-sm">Pelajari cara menggunakan aplikasi dengan optimal</p>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-lg text-indigo-800 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />🚀 Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <span className="text-sm">
                Tambah produk di <strong>Kelola Stok</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <span className="text-sm">
                Mulai jual di <strong>Kasir</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <span className="text-sm">
                Pantau performa di <strong>Laporan</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Guide */}
      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">📚 Panduan Fitur</h2>
        {features.map((feature, index) => (
          <Card key={index} className="bg-white/70 backdrop-blur-sm border-gray-200/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-${feature.color}-100`}>
                  <feature.icon className={`h-5 w-5 text-${feature.color}-600`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {feature.tips.map((tip, tipIndex) => (
                  <div key={tipIndex} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Business Concepts */}
      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">💡 Konsep Bisnis</h2>
        {concepts.map((concept, index) => (
          <Card key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100">
                  <concept.icon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">{concept.title}</h3>
                  <p className="text-sm text-amber-700">{concept.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Button */}
      <div className="text-center">
        <EnhancedButton
          onClick={() => router.push("/")}
          className="bg-indigo-500 hover:bg-indigo-600 rounded-2xl px-8 py-3 text-white"
        >
          Kembali ke Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </EnhancedButton>
      </div>
    </div>
  )
}
