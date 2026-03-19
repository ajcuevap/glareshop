"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

// Tipos adaptados para los datos que llegan
type Producto = {
    id: string
    producto: string
    marca: string
    stock: number
    precio_compra_mas_tax: number
}

type VentaItem = {
    producto_id: string
    nombre: string
    marca: string
    cantidad: number
    subtotal: number
}

type Venta = {
    total: number
    productos_vendidos: VentaItem[]
}

export default function Reportes() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    const [inventario, setInventario] = useState<Producto[]>([])
    const [ventas, setVentas] = useState<Venta[]>([])

    // Métricas calculadas
    const [ingresosTotales, setIngresosTotales] = useState(0)
    const [gananciaEstimada, setGananciaEstimada] = useState(0)
    const [valorInventarioVendido, setValorInventarioVendido] = useState(0)
    const [valorInventario, setValorInventario] = useState(0)

    const [topProductos, setTopProductos] = useState<{ id: string, nombre: string, marca: string, cantidad: number }[]>([])
    const [stockBajo, setStockBajo] = useState<Producto[]>([])

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) {
                router.replace("/login")
            } else {
                fetchData()
            }
        }
        checkAuthAndLoad()
    }, [router])

    const fetchData = async () => {
        setLoading(true)

        // 1. Cargar Productos
        const { data: prodsData } = await supabase
            .from("productos")
            .select("id, producto, marca, stock, precio_compra_mas_tax")
        
        const prods = prodsData || []
        setInventario(prods)

        // 2. Cargar Ventas
        const { data: ventasData } = await supabase
            .from("ventas")
            .select("total, productos_vendidos")
        
        const sales = ventasData || []
        setVentas(sales)

        // --- CÁLCULOS ---
        
        // Mapa rápido de productos para buscar sus costos
        const mapProductos = new Map<string, Producto>()
        prods.forEach((p: Producto) => mapProductos.set(p.id, p))

        let sumIngresos = 0
        let sumGanancia = 0
        let sumCostoVendido = 0
        const topChartMap = new Map<string, { nombre: string, marca: string, cantidad: number }>()

        sales.forEach((v: Venta) => {
            sumIngresos += Number(v.total)

            v.productos_vendidos.forEach(item => {
                // Calcular costo (inversión) de lo que ya se vendió
                const prodRef = mapProductos.get(item.producto_id)
                let costoTotalItem = 0
                if (prodRef) {
                    costoTotalItem = prodRef.precio_compra_mas_tax * item.cantidad
                } else {
                    // Si el producto fue borrado, estimamos su costo restando un 30% a su precio final de venta
                    costoTotalItem = item.subtotal * 0.70
                }
                
                sumCostoVendido += costoTotalItem
                sumGanancia += (item.subtotal - costoTotalItem)

                // Sumar para el Top 5
                const current = topChartMap.get(item.producto_id) || { nombre: item.nombre, marca: item.marca, cantidad: 0 }
                current.cantidad += item.cantidad
                topChartMap.set(item.producto_id, current)
            })
        })

        // Top 5 Productos
        const topList = Array.from(topChartMap.entries())
            .map(([id, info]) => ({ id, ...info }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5)

        // Valor del inventario actual
        let sumInv = 0
        prods.forEach((p: Producto) => {
            sumInv += (p.stock * p.precio_compra_mas_tax)
        })

        // Alertas de Stock (Agotados, = 0)
        const alertas = prods.filter((p: Producto) => p.stock === 0)

        // Actualizar estados
        setIngresosTotales(sumIngresos)
        setGananciaEstimada(sumGanancia)
        setValorInventarioVendido(sumCostoVendido)
        setValorInventario(sumInv)
        setTopProductos(topList)
        setStockBajo(alertas)

        setLoading(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <main className="min-h-screen p-8 max-w-[1400px] mx-auto">
            <header className="flex justify-between items-center mb-10 gap-4 flex-wrap">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
                        📊 Reportes & Analíticas
                    </h1>
                    <p className="text-slate-400 mt-2">Visión global de tu negocio y finanzas</p>
                </div>
                
                <button 
                    onClick={() => router.push("/dashboard")}
                    className="px-6 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors text-slate-300 font-medium flex items-center gap-2"
                >
                    <span>←</span> Volver al Dashboard
                </button>
            </header>

            {/* 4 TARJETAS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform"></div>
                    <p className="text-slate-400 font-medium mb-1">Ingresos Brutos Totales</p>
                    <h3 className="text-3xl font-black text-emerald-400">${ingresosTotales.toFixed(2)}</h3>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-500/10 rounded-full group-hover:scale-150 transition-transform"></div>
                    <p className="text-slate-400 font-medium mb-1">Ganancia Estimada</p>
                    <h3 className="text-3xl font-black text-teal-400">${gananciaEstimada.toFixed(2)}</h3>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-fuchsia-500/10 rounded-full group-hover:scale-150 transition-transform"></div>
                    <p className="text-slate-400 font-medium mb-1">Valor Inventario Vendido</p>
                    <h3 className="text-3xl font-black text-fuchsia-400">${valorInventarioVendido.toFixed(2)}</h3>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full group-hover:scale-150 transition-transform"></div>
                    <p className="text-slate-400 font-medium mb-1">Valor en Inventario Activo</p>
                    <h3 className="text-3xl font-black text-indigo-400">${valorInventario.toFixed(2)}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* TOP 5 PRODUCTOS MÁS VENDIDOS */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2 w-full">🏆 Top 5 Productos Más Vendidos</h2>
                    </div>

                    <div className="flex flex-col gap-5 flex-1 justify-center">
                        {topProductos.length > 0 ? topProductos.map((prod, index) => {
                            // Calcular porcentaje para la barra visual relativo al más vendido
                            const maxVendido = topProductos[0].cantidad;
                            const porcentaje = (prod.cantidad / maxVendido) * 100;

                            return (
                                <div key={prod.id} className="relative">
                                    <div className="flex justify-between items-end mb-1">
                                        <div>
                                            <span className="text-slate-200 font-semibold">{index + 1}. {prod.nombre}</span>
                                            <p className="text-xs text-slate-500">{prod.marca}</p>
                                        </div>
                                        <span className="text-sky-400 font-bold">{prod.cantidad} vend.</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-sky-600 to-sky-400 h-3 rounded-full transition-all duration-1000"
                                            style={{ width: `${porcentaje}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        }) : (
                            <p className="text-center text-slate-500">No hay suficientes ventas para generar el Top 5 aún.</p>
                        )}
                    </div>
                </div>

                {/* ALERTAS DE STOCK AGOTADO */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-rose-400 border-b border-rose-900/50 pb-2 w-full">
                            🚨 Productos Agotados
                        </h2>
                    </div>

                    <div className="flex-1 bg-slate-900/30 rounded-xl overflow-y-auto max-h-[350px] border border-slate-700/50">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/80 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-slate-300 font-semibold">Producto</th>
                                    <th className="p-3 text-slate-300 font-semibold text-center">Stock Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockBajo.map((p) => (
                                    <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                                        <td className="p-3">
                                            <p className="font-semibold text-white">{p.producto}</p>
                                            <p className="text-xs text-slate-400">{p.marca}</p>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="px-3 py-1 rounded-full font-bold text-xs bg-rose-500/20 text-rose-400 border border-rose-500/50">
                                                Agotado
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {stockBajo.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="p-12 text-center text-slate-500">
                                            Todo en orden. Ningún producto está agotado por ahora.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </main>
    )
}
