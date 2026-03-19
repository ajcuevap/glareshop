"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type ProductoCatalogo = {
    id: string
    marca: string
    producto: string
    color: string | null
    pvp: number
    stock: number
}

export default function CatalogoPublico() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [productos, setProductos] = useState<ProductoCatalogo[]>([])
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) {
                router.replace("/login")
            } else {
                fetchProductos()
            }
        }
        checkAuthAndLoad()
    }, [router])

    const fetchProductos = async () => {
        setLoading(true)
        const { data } = await supabase
            .from("productos")
            .select("id, marca, producto, color, pvp, stock")
            .gt("stock", 0)
            .order("marca", { ascending: true })
        
        if (data) setProductos(data)
        setLoading(false)
    }

    const productosFiltrados = productos.filter(p => {
        const query = searchTerm.toLowerCase();
        const textoCompleto = `${p.marca} ${p.producto} ${p.color || ""}`.toLowerCase();
        return textoCompleto.includes(query)
    })

    if (loading && productos.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <main className="min-h-screen p-8 max-w-[1400px] mx-auto">
            
            <header className="flex justify-between items-center mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        📱 Catálogo de Clientes
                    </h1>
                    <p className="text-slate-400 mt-2">Búsqueda rápida de productos y precios al público</p>
                </div>
                
                <button 
                    onClick={() => router.push("/dashboard")}
                    className="px-6 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors text-slate-300 font-medium flex items-center gap-2 shrink-0"
                >
                    <span>←</span> Volver al Dashboard
                </button>
            </header>

            <div className="glass-panel p-6 rounded-2xl mb-8 relative z-10 w-full flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span>🔍</span>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar por marca, producto o color..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 px-4 py-3 rounded-xl shrink-0">
                    <span className="text-slate-400 text-sm">Mostrando: <strong className="text-white">{productosFiltrados.length}</strong> items</span>
                </div>
            </div>

            {/* Resultados de Productos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productosFiltrados.map((item) => (
                    <div 
                        key={item.id} 
                        className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-colors group"
                    >
                        <div className="mb-4">
                            <span className="inline-block px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-semibold uppercase tracking-wider mb-2 border border-slate-700/50">
                                {item.marca}
                            </span>
                            <h3 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-indigo-300 transition-colors">
                                {item.producto}
                            </h3>
                            {item.color && (
                                <p className="text-slate-400 text-sm">
                                    Color: <span className="text-slate-200">{item.color}</span>
                                </p>
                            )}
                        </div>
                        
                        <div className="mt-auto bg-slate-900/40 rounded-xl p-3 border border-slate-700/50 flex justify-between items-end">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Precio PVP</p>
                                <p className="text-2xl font-black text-white">
                                    ${item.pvp.toFixed(2)}
                                </p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-xs font-bold text-emerald-400 mb-1">
                                    ● Disponible
                                </span>
                                <span className="text-sm font-bold text-slate-300">
                                    {item.stock} <span className="text-xs font-normal text-slate-500">und.</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {productosFiltrados.length === 0 && (
                <div className="glass-panel p-12 rounded-2xl text-center mt-6">
                    <div className="text-5xl mb-4 opacity-50">🔍</div>
                    <h2 className="text-xl font-bold text-white mb-2">No se encontraron productos</h2>
                    <p className="text-slate-400">Intenta buscar con otro término o verifica que el producto tenga stock disponible.</p>
                </div>
            )}

        </main>
    )
}
