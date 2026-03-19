"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Dashboard() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAuth = async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) {
                router.replace("/login")
            } else {
                setLoading(false)
            }
        }
        checkAuth()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <main className="min-h-screen p-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
                        Bienvenido al sistema 🔥
                    </h1>
                    <p className="text-slate-400 mt-2">Panel de control de GlareShop</p>
                </div>
                
                <button 
                    onClick={async () => {
                        await supabase.auth.signOut()
                        router.replace("/login")
                    }}
                    className="px-6 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors text-slate-300 font-medium"
                >
                    Cerrar Sesión
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div 
                    onClick={() => router.push("/productos")}
                    className="glass-panel p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group"
                >
                    <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        📦
                    </div>
                    <h2 className="text-xl font-bold mb-2">Productos</h2>
                    <p className="text-slate-400 text-sm">Gestiona el inventario, añade nuevos productos y actualiza el stock.</p>
                </div>

                <div 
                    onClick={() => router.push("/ventas")}
                    className="glass-panel p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group"
                >
                    <div className="w-12 h-12 bg-fuchsia-500/20 text-fuchsia-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        💰
                    </div>
                    <h2 className="text-xl font-bold mb-2">Ventas</h2>
                    <p className="text-slate-400 text-sm">Registra nuevas ventas y descuenta automáticamente del inventario.</p>
                </div>

                <div 
                    onClick={() => router.push("/reportes")}
                    className="glass-panel p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group border border-sky-500/30"
                >
                    <div className="w-12 h-12 bg-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        📊
                    </div>
                    <h2 className="text-xl font-bold mb-2">Reportes</h2>
                    <p className="text-slate-400 text-sm">Visualiza métricas, ganancias, productos más vendidos y alertas de stock.</p>
                </div>
            </div>
        </main>
    )
}