import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GlareShop - Inventario y Ventas",
  description: "Sistema web premium de inventario y ventas",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-screen bg-slate-900 text-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  )
}
