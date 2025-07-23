import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Header } from "@/components/header"
import { ConfirmationProvider } from "@/components/providers/confirmation-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HaloLaba - Sistem Manajemen Warung",
  description: "Sistem manajemen warung yang mudah dan efektif",
  manifest: "/manifest.json",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Header />
          <main className="pb-24">{children}</main>
          <BottomNavigation />
          <ConfirmationProvider />
        </div>
      </body>
    </html>
  )
}
