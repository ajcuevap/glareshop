"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

type Producto = {
    id: string
    categoria: string // NUEVO CAMPO
    tienda: string
    marca: string
    color?: string
    producto: string
    cantidad: number
    precio_compra_marcado: number
    precio_compra_mas_tax: number
    compra_total: number
    stock: number
    pvp: number
    ganancia: number
}

export default function Productos() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [productos, setProductos] = useState<Producto[]>([])

    // States for form
    const [categoria, setCategoria] = useState("Maquillaje") // Valor por defecto
    const [tienda, setTienda] = useState("")
    const [marca, setMarca] = useState("")
    const [color, setColor] = useState("")
    const [producto, setProducto] = useState("")
    const [cantidad, setCantidad] = useState("")
    const [precioCompra, setPrecioCompra] = useState("")
    const [pvp, setPvp] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const checkAuthAndLoadData = async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) {
                router.replace("/login")
            } else {
                fetchProductos()
            }
        }
        checkAuthAndLoadData()
    }, [router])

    const fetchProductos = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("productos")
            .select("*")
            .order("created_at", { ascending: false })
        
        if (!error && data) {
            setProductos(data)
        }
        setLoading(false)
    }

    const guardarProducto = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        const cat = parseInt(cantidad)
        const prec = parseFloat(precioCompra)
        const targetPvp = parseFloat(pvp)

        // Cálculos reales que se enviarán a la base de datos
        const calcPrecioConTax = prec * 1.095
        const calcCompraTotal = cat * calcPrecioConTax
        const calcGanancia = targetPvp - calcPrecioConTax

        const nuevoProducto = {
            categoria, // Campo nuevo guardado en BDD
            tienda,
            marca,
            color: color || null,
            producto,
            cantidad: cat,
            precio_compra_marcado: prec,
            precio_compra_mas_tax: calcPrecioConTax,
            compra_total: calcCompraTotal,
            stock: cat,
            pvp: targetPvp,
            ganancia: calcGanancia
        }

        const { error } = await supabase.from("productos").insert([nuevoProducto])

        if (error) {
            alert("Error al guardar: " + error.message)
        } else {
            // Limpiar formulario y recargar tabla (no limpiamos categoria para rapidez)
            setTienda("")
            setMarca("")
            setColor("")
            setProducto("")
            setCantidad("")
            setPrecioCompra("")
            setPvp("")
            fetchProductos()
        }
        setIsSaving(false)
    }

    const eliminarProducto = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este producto?")) return
        
        const { error } = await supabase.from("productos").delete().eq("id", id)
        if (!error) {
            setProductos(productos.filter(p => p.id !== id))
        }
    }

    // Cálculos en vivo (solo para previsualización en el UI del formulario)
    const currentPrecio = parseFloat(precioCompra) || 0
    const currentCantidad = parseInt(cantidad) || 0
    const currentPvp = parseFloat(pvp) || 0

    const formPrecioConTax = currentPrecio * 1.095
    const formCompraTotal = currentCantidad * formPrecioConTax
    const formGanancia = currentPvp - formPrecioConTax

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
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
                        📦 Inventario
                    </h1>
                    <p className="text-slate-400 mt-2">Agrega y visualiza tus productos</p>
                </div>
                
                <button 
                    onClick={() => router.push("/dashboard")}
                    className="px-6 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors text-slate-300 font-medium flex items-center gap-2"
                >
                    <span>←</span> Volver al Dashboard
                </button>
            </header>

            {/* FORMULARIO */}
            <form onSubmit={guardarProducto} className="glass-panel p-6 rounded-2xl mb-8">
                <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-2">➕ Nuevo Producto</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                    {/* Select de Categoría */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Categoría*</label>
                        <select 
                            value={categoria} 
                            onChange={e => setCategoria(e.target.value)} 
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="Maquillaje">💄 Maquillaje</option>
                            <option value="Carteras">👜 Carteras</option>
                            <option value="Skin Care">✨ Skin Care</option>
                            <option value="Accesorios">💍 Accesorios</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Tienda*</label>
                        <input required type="text" value={tienda} onChange={e => setTienda(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Marca*</label>
                        <input required type="text" value={marca} onChange={e => setMarca(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Color (Opcional)</label>
                        <input type="text" value={color} onChange={e => setColor(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-sm text-slate-400 mb-1">Producto*</label>
                        <input required type="text" value={producto} onChange={e => setProducto(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Cantidad comprada*</label>
                        <input required type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Precio Compra Marcado*</label>
                        <input required type="number" step="0.01" value={precioCompra} onChange={e => setPrecioCompra(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm text-indigo-300 font-medium mb-1">PVP (Venta)*</label>
                        <input required type="number" step="0.01" value={pvp} onChange={e => setPvp(e.target.value)} className="w-full bg-indigo-900/30 border border-indigo-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400" />
                    </div>
                </div>

                {/* Previsualización de Cálculos */}
                <div className="bg-slate-900/40 rounded-xl p-4 mb-6 flex flex-wrap gap-6 text-sm">
                    <div>
                        <span className="text-slate-400">Precio + Tax (9.5%):</span>
                        <p className="text-lg font-bold text-white">${formPrecioConTax.toFixed(2)}</p>
                    </div>
                    <div>
                        <span className="text-slate-400">Total Inversión:</span>
                        <p className="text-lg font-bold text-white">${formCompraTotal.toFixed(2)}</p>
                    </div>
                    <div>
                        <span className="text-slate-400">Ganancia por unidad:</span>
                        <p className={`text-lg font-bold ${formGanancia > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            ${formGanancia.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Guardando..." : "Guardar Producto"}
                    </button>
                </div>
            </form>

            {/* TABLA DE PRODUCTOS */}
            <div className="glass-panel p-6 rounded-2xl overflow-x-auto">
                <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-2">📋 Inventario Actual</h2>
                
                <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                        <tr className="border-b border-slate-700 text-slate-400 text-sm">
                            <th className="p-3 font-medium">Categoría</th>
                            <th className="p-3 font-medium">Tienda</th>
                            <th className="p-3 font-medium">Marca</th>
                            <th className="p-3 font-medium">Producto</th>
                            <th className="p-3 font-medium text-center">Color</th>
                            <th className="p-3 font-medium text-center">Cant. Original</th>
                            <th className="p-3 font-medium text-center text-teal-300">Stock Actual</th>
                            <th className="p-3 font-medium">Precio+Tax</th>
                            <th className="p-3 font-medium">Total Inversión</th>
                            <th className="p-3 font-medium text-indigo-300">PVP</th>
                            <th className="p-3 font-medium text-emerald-400">Ganancia/u</th>
                            <th className="p-3 font-medium">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {productos.map(p => {
                            const precioConTax = p.precio_compra_mas_tax || 0;
                            const compraTotal = p.compra_total || 0;
                            const ganancia = p.ganancia || 0;

                            return (
                                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                    <td className="p-3 text-indigo-300 font-medium">
                                        {p.categoria === "Carteras" ? "👜 Carteras" : p.categoria === "Maquillaje" ? "💄 Maquillaje" : p.categoria || "💄 Maquillaje"}
                                    </td>
                                    <td className="p-3">{p.tienda}</td>
                                    <td className="p-3">{p.marca}</td>
                                    <td className="p-3 font-medium text-white">{p.producto}</td>
                                    <td className="p-3 text-center text-slate-400">{p.color || "-"}</td>
                                    <td className="p-3 text-center">{p.cantidad}</td>
                                    <td className="p-3 text-center font-bold text-teal-400">{p.stock}</td>
                                    <td className="p-3">${precioConTax.toFixed(2)}</td>
                                    <td className="p-3">${compraTotal.toFixed(2)}</td>
                                    <td className="p-3 font-bold text-indigo-300">${p.pvp.toFixed(2)}</td>
                                    <td className={`p-3 font-bold ${ganancia > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                        ${ganancia.toFixed(2)}
                                    </td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => eliminarProducto(p.id)}
                                            className="text-rose-400 hover:text-rose-300 transition-colors"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {productos.length === 0 && (
                            <tr>
                                <td colSpan={12} className="py-8 text-center text-slate-500">
                                    No hay productos registrados aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </main>
    )
}
