"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

// Types
type ProductoEnDB = {
    id: string
    marca: string
    producto: string
    color: string | null
    stock: number
    pvp: number
}

type ProductoEnCarrito = {
    producto_id: string
    marca: string
    nombre: string
    color: string | null
    cantidad: number
    precio_unitario: number
    subtotal: number
}

type Venta = {
    id: string
    cliente: string
    total: number
    productos_vendidos: ProductoEnCarrito[]
    created_at: string
    estado_pago: string
    abono?: number
    comentario?: string
}

export default function Ventas() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    
    // Data from DB
    const [inventario, setInventario] = useState<ProductoEnDB[]>([])
    const [ventasHistorial, setVentasHistorial] = useState<Venta[]>([])

    // States for New Sale
    const [cliente, setCliente] = useState("")
    const [carrito, setCarrito] = useState<ProductoEnCarrito[]>([])
    const [estadoPago, setEstadoPago] = useState("Pagado")
    const [abonoInput, setAbonoInput] = useState("")
    const [comentario, setComentario] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)

    // States for Adding Product to Cart
    const [selectedMarca, setSelectedMarca] = useState("")
    const [selectedProductoId, setSelectedProductoId] = useState("")
    const [cantidadSelect, setCantidadSelect] = useState("1")
    const [precioUnitarioEdit, setPrecioUnitarioEdit] = useState("")

    // States for Editing/Deleting Sale
    const [editandoVentaId, setEditandoVentaId] = useState<string | null>(null)

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const { data } = await supabase.auth.getUser()
            if (!data.user) {
                router.replace("/login")
            } else {
                fetchInitialData()
            }
        }
        checkAuthAndLoad()
    }, [router])

    const fetchInitialData = async () => {
        setLoading(true)
        // Traer todos los productos que tengan stock > 0
        const { data: prods } = await supabase
            .from("productos")
            .select("id, marca, producto, color, stock, pvp")
            .gt("stock", 0)
            .order("marca", { ascending: true })
        
        if (prods) setInventario(prods)

        // Traer historial de ventas
        const { data: sales } = await supabase
            .from("ventas")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20) // Últimas 20 ventas por ahora
        
        if (sales) setVentasHistorial(sales)

        setLoading(false)
    }

    // Listas derivadas para los menús desplegables
    // Obtener marcas únicas
    const marcasDisponibles = Array.from(new Set(inventario.map(p => p.marca)))
    
    // Obtener productos filtrados por la marca seleccionada
    const productosDeMarca = inventario.filter(p => p.marca === selectedMarca)

    // Efecto para auto-completar el precio cuando eligen un producto
    useEffect(() => {
        if (selectedProductoId) {
            const prod = inventario.find(p => p.id === selectedProductoId)
            if (prod) {
                setPrecioUnitarioEdit(prod.pvp.toString())
                setCantidadSelect("1")
            }
        } else {
            setPrecioUnitarioEdit("")
        }
    }, [selectedProductoId, inventario])

    // Agregar al carrito temporal
    const agregarAlCarrito = () => {
        if (!selectedProductoId) return alert("Selecciona un producto")
        
        const cant = parseInt(cantidadSelect)
        const precioUnit = parseFloat(precioUnitarioEdit)

        if (cant <= 0) return alert("Cantidad inválida")
        if (precioUnit < 0) return alert("Precio inválido")

        const prodDB = inventario.find(p => p.id === selectedProductoId)
        if (!prodDB) return

        if (cant > prodDB.stock) {
            return alert(`Solo hay ${prodDB.stock} en stock.`)
        }

        const newItem: ProductoEnCarrito = {
            producto_id: prodDB.id,
            marca: prodDB.marca,
            nombre: prodDB.producto,
            color: prodDB.color,
            cantidad: cant,
            precio_unitario: precioUnit,
            subtotal: cant * precioUnit
        }

        setCarrito([...carrito, newItem])

        // Limpiar sección de agregar
        setSelectedMarca("")
        setSelectedProductoId("")
        setCantidadSelect("1")
        setPrecioUnitarioEdit("")
    }

    const removerDelCarrito = (index: number) => {
        const newCarrito = [...carrito]
        newCarrito.splice(index, 1)
        setCarrito(newCarrito)
    }

    const totalVentaActual = carrito.reduce((acc, item) => acc + item.subtotal, 0)

    // Limpiar formulario y carrito
    const limpiarFormulario = () => {
        setEditandoVentaId(null)
        setCliente("")
        setCarrito([])
        setEstadoPago("Pagado")
        setAbonoInput("")
        setComentario("")
    }

    // Ejecutar Venta: Guardar DB y descontar Stock
    const procesarVenta = async (e: React.FormEvent) => {
        e.preventDefault()
        if (carrito.length === 0) return alert("Agrega productos a la venta")
        if (!cliente.trim()) return alert("Ingresa el nombre del cliente")

        setIsProcessing(true)

        // Procesar Abono
        const abonoValor = estadoPago === "Pagado" ? totalVentaActual : (parseFloat(abonoInput) || 0)

        // Data central
        const dataVenta = {
            cliente,
            total: totalVentaActual,
            productos_vendidos: carrito,
            estado_pago: estadoPago,
            abono: abonoValor,
            comentario: comentario.trim() || null
        }

        if (editandoVentaId) {
            // --- MODO ACTUALIZAR ---
            const oldVenta = ventasHistorial.find(v => v.id === editandoVentaId)
            
            if (oldVenta) {
                // Calcular Diffs de Stock
                const stockDiffs: Record<string, number> = {} // id -> (nuevo - viejo)
                for (const item of oldVenta.productos_vendidos) {
                    stockDiffs[item.producto_id] = -(item.cantidad)
                }
                for (const item of carrito) {
                    stockDiffs[item.producto_id] = (stockDiffs[item.producto_id] || 0) + item.cantidad
                }
                
                // Aplicar diffs
                for (const [prodId, diff] of Object.entries(stockDiffs)) {
                    if (diff !== 0) {
                        const { data: prodData } = await supabase.from('productos').select('stock').eq('id', prodId).single()
                        if (prodData) {
                            // diff positivo = sacamos más del stock = (stock_actual - diff)
                            // diff negativo = devolvimos al stock (resta de un negativo es suma)
                            await supabase.from('productos').update({ stock: prodData.stock - diff }).eq('id', prodId)
                        }
                    }
                }
            }

            // Actualizar DB
            const { error: errorUpdate } = await supabase.from('ventas').update(dataVenta).eq('id', editandoVentaId)
            
            if (errorUpdate) {
                alert("Error al actualizar la venta: " + errorUpdate.message)
            } else {
                alert("¡Orden actualizada exitosamente!")
            }

        } else {
            // --- MODO CREAR NUEVO ---
            const { error: errorVenta } = await supabase.from("ventas").insert([dataVenta])

            if (errorVenta) {
                alert("Error al registrar venta (¿Creaste la tabla en Supabase?): " + errorVenta.message)
                setIsProcessing(false)
                return
            }

            // Descontar Stock por cada producto vendido (Directo BD)
            for (const item of carrito) {
                const { data: prodData } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single()
                if (prodData) {
                    await supabase.from("productos").update({ stock: prodData.stock - item.cantidad }).eq("id", item.producto_id)
                }
            }

            alert("¡Venta registrada exitosamente!")
        }
        
        limpiarFormulario()
        fetchInitialData() // Trae historial y stock actualizados
        setIsProcessing(false)
    }

    // Marcar una reserva como pagada en tu totalidad
    const marcarComoPagado = async (venta: Venta) => {
        const confirmar = window.confirm(`El cliente debe $${(venta.total - (venta.abono || 0)).toFixed(2)}. ¿Confirmas que acaba de cancelar la totalidad de la deuda?`)
        if (!confirmar) return

        const { error } = await supabase
            .from("ventas")
            .update({ 
                estado_pago: "Pagado", 
                abono: venta.total // Al pagarlo todo, el abono se vuelve igual al total
            })
            .eq("id", venta.id)
        
        if (error) {
            alert("Error al actualizar: " + error.message)
        } else {
            fetchInitialData()
        }
    }

    const iniciarEdicionVenta = (v: Venta) => {
        setEditandoVentaId(v.id)
        setCliente(v.cliente)
        setCarrito(v.productos_vendidos)
        setEstadoPago(v.estado_pago)
        setAbonoInput(v.abono ? v.abono.toString() : "")
        setComentario(v.comentario || "")
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const anularVentaYDovolverStock = async (v: Venta) => {
        const confirmacion = window.confirm("💥 ADVERTENCIA 💥\n\n¿Estás SEGURO de que deseas ANULAR toda esta venta?\n\nAl hacerlo:\n1. La venta se borrará del historial para siempre.\n2. Todos los productos volverán a sumarse al inventario de Stock.\n\nEsta acción NO se puede deshacer.")
        if (!confirmacion) return
        
        // 1. Devolver Stock (Consultando directamente la BD para productos en stock cero)
        for (const item of v.productos_vendidos) {
            const { data: prodData } = await supabase
                .from('productos')
                .select('stock')
                .eq('id', item.producto_id)
                .single()
                
            if (prodData) {
                const nuevoStock = prodData.stock + item.cantidad
                await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.producto_id)
            }
        }

        // 2. Eliminar la venta de la base de datos
        const { error } = await supabase.from('ventas').delete().eq('id', v.id)
        if (!error) {
            setEditandoVentaId(null)
            fetchInitialData()
            alert("Venta Anulada Exitosamente. El stock ha sido retornado.")
        } else {
            alert("Error al anular venta: " + error.message)
        }
    }

    if (loading && inventario.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <main className="min-h-screen p-8 max-w-[1400px] mx-auto">
            <header className="flex justify-between items-center mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                        💰 Punto de Venta
                    </h1>
                    <p className="text-slate-400 mt-2">Registra ventas y actualiza tu stock al instante</p>
                </div>
                
                <button 
                    onClick={() => router.push("/dashboard")}
                    className="px-6 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors text-slate-300 font-medium flex items-center gap-2"
                >
                    <span>←</span> Volver al Dashboard
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LADO IZQUIERDO: AGREGAR PRODUCTOS */}
                <div className={`glass-panel p-6 rounded-2xl flex flex-col gap-6 self-start relative z-10 w-full ${editandoVentaId ? 'border-2 border-indigo-500 shadow-lg shadow-indigo-500/20' : ''}`}>
                    <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2 flex justify-between items-center">
                        <span>{editandoVentaId ? "✏️ Editando Venta Activa" : "🛒 Generar Venta"}</span>
                        {editandoVentaId && (
                            <button onClick={limpiarFormulario} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg text-white">
                                ❌ Cancelar Edición
                            </button>
                        )}
                    </h2>

                    <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-700/50">
                        <label className="block text-sm text-slate-400 mb-1">Nombre del Cliente*</label>
                        <input 
                            required 
                            type="text" 
                            placeholder="Ej. María Sánchez"
                            value={cliente} 
                            onChange={e => setCliente(e.target.value)} 
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                        />
                    </div>

                    <div className="bg-slate-800/30 p-5 rounded-xl border border-emerald-900/30">
                        <h3 className="text-emerald-400 font-semibold mb-4">Añadir Producto a la Cuenta</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* PASO 1: SELECCIONAR MARCA */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">1. Marca</label>
                                <select 
                                    value={selectedMarca} 
                                    onChange={e => {
                                        setSelectedMarca(e.target.value)
                                        setSelectedProductoId("") // Resetear producto
                                    }} 
                                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {marcasDisponibles.map((m, i) => (
                                        <option key={i} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* PASO 2: SELECCIONAR PRODUCTO (filtrado por marca) */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">2. Producto</label>
                                <select 
                                    value={selectedProductoId} 
                                    onChange={e => setSelectedProductoId(e.target.value)} 
                                    disabled={!selectedMarca}
                                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {productosDeMarca.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.producto} {p.color ? `(${p.color})` : ""} - Stock: {p.stock}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* PASO 3: CANTIDAD */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">3. Cantidad a vender</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={cantidadSelect} 
                                    onChange={e => setCantidadSelect(e.target.value)} 
                                    disabled={!selectedProductoId}
                                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50" 
                                />
                            </div>

                            {/* PASO 4: PRECIO (EDITABLE) */}
                            <div>
                                <label className="block text-sm text-emerald-300 mb-1">4. Precio Unitario ($)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={precioUnitarioEdit} 
                                    onChange={e => setPrecioUnitarioEdit(e.target.value)} 
                                    disabled={!selectedProductoId}
                                    className="w-full bg-emerald-900/20 border border-emerald-500/50 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-400 disabled:opacity-50" 
                                />
                            </div>
                        </div>

                        {selectedProductoId && (
                            <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-700 mb-4">
                                <span className="text-sm text-slate-400">Total por este artículo:</span>
                                <span className="text-xl font-bold text-white">
                                    ${ ((parseFloat(precioUnitarioEdit) || 0) * (parseInt(cantidadSelect) || 0)).toFixed(2) }
                                </span>
                            </div>
                        )}

                        <button 
                            type="button"
                            onClick={agregarAlCarrito}
                            disabled={!selectedProductoId}
                            className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-lg"
                        >
                            ➕ Añadir a la cuenta
                        </button>
                    </div>
                </div>

                {/* LADO DERECHO: CARRITO Y CONFIRMACIÓN */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col self-start relative z-10 w-full min-h-[500px]">
                    <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2 mb-4">🧾 Cuenta Actual</h2>
                    
                    <div className="flex-1 bg-slate-900/30 rounded-xl overflow-x-auto mb-6 border border-slate-700/50">
                        <table className="w-full text-left text-sm min-w-[400px]">
                            <thead className="bg-slate-800/80">
                                <tr>
                                    <th className="p-3 text-slate-200 font-semibold">Ítem</th>
                                    <th className="p-3 text-slate-200 font-semibold text-center">Cant.</th>
                                    <th className="p-3 text-slate-200 font-semibold text-right">Unitario</th>
                                    <th className="p-3 text-slate-200 font-semibold text-right">Total</th>
                                    <th className="p-3 text-slate-200 font-semibold text-center">❌</th>
                                </tr>
                            </thead>
                            <tbody>
                                {carrito.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/40">
                                        <td className="p-3">
                                            <p className="font-semibold text-white">{item.nombre}</p>
                                            <p className="text-xs text-slate-400">{item.marca} {item.color ? `(${item.color})` : ""}</p>
                                        </td>
                                        <td className="p-3 text-center text-teal-300 font-bold">{item.cantidad}</td>
                                        <td className="p-3 text-right text-slate-300">${item.precio_unitario.toFixed(2)}</td>
                                        <td className="p-3 text-right font-bold text-emerald-400">${item.subtotal.toFixed(2)}</td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => removerDelCarrito(idx)}
                                                className="text-rose-500 hover:text-rose-400 font-bold text-lg"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {carrito.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500">
                                            No hay productos en la cuenta aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-5 mb-6 flex justify-between items-center">
                        <span className="text-lg text-slate-300 font-medium">Total a Cobrar:</span>
                        <span className="text-5xl font-black text-emerald-400">${totalVentaActual.toFixed(2)}</span>
                    </div>

                    <form onSubmit={procesarVenta}>
                        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-700/50 mb-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Estado de la Venta</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEstadoPago("Pagado")
                                            setAbonoInput("")
                                        }}
                                        className={`py-3 rounded-lg font-bold border transition-colors ${estadoPago === 'Pagado' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        ✅ Pagado Completo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEstadoPago("Pendiente")}
                                        className={`py-3 rounded-lg font-bold border transition-colors ${estadoPago === 'Pendiente' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        ⏳ Reservar (Monto Parcial)
                                    </button>
                                </div>
                            </div>

                            {/* Caja extra si es Reserva */}
                            {estadoPago === "Pendiente" && (
                                <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg flex flex-col gap-4 mt-2">
                                    <div>
                                        <label className="block text-sm text-orange-300 font-semibold mb-1">¿Cuánto dejó de Abono Inicial? ($)</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            min="0"
                                            value={abonoInput}
                                            onChange={(e) => setAbonoInput(e.target.value)}
                                            placeholder="Ej. 20.00"
                                            className="w-full bg-slate-900/80 border border-orange-500/50 rounded-lg px-3 py-2 text-white font-bold max-w-[200px]"
                                        />
                                        {abonoInput && (
                                            <p className="text-orange-400 text-sm mt-2 font-bold">
                                                🚨 Saldo Restante (Deuda): ${(totalVentaActual - parseFloat(abonoInput)).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Comandos extras (Opcional)</label>
                                        <input 
                                            type="text" 
                                            value={comentario}
                                            onChange={(e) => setComentario(e.target.value)}
                                            placeholder="Ej. Dijo que viene el sábado a pagar..."
                                            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Solo comentarios si es pagado */}
                            {estadoPago === "Pagado" && (
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Notas (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={comentario}
                                        onChange={(e) => setComentario(e.target.value)}
                                        placeholder="Alguna anotación sobre esta venta..."
                                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit"
                            disabled={isProcessing || carrito.length === 0}
                            className={`w-full text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 transform hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:shadow-none ${editandoVentaId ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'}`}
                        >
                            {isProcessing ? "Procesando..." : editandoVentaId ? "💾 Guardar Edición Completa" : "✅ Procesar y Confirmar"}
                        </button>
                    </form>
                </div>
            </div>

            {/* HISTORIAL RECIENTE */}
            <div className="glass-panel p-6 rounded-2xl mt-8">
                <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2 mb-6">📜 Últimas Ventas Realizadas</h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-slate-700 bg-slate-800/50">
                                <th className="p-4 font-semibold text-slate-200">Fecha y Hora</th>
                                <th className="p-4 font-semibold text-slate-200">Cliente</th>
                                <th className="p-4 font-semibold text-slate-200">Detalle</th>
                                <th className="p-4 font-semibold text-emerald-400 text-right">Monto Total</th>
                                <th className="p-4 font-semibold text-slate-200 text-right">Abonos / Saldos</th>
                                <th className="p-4 font-semibold text-slate-200 text-center">Gestión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventasHistorial.map(v => (
                                <tr key={v.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                    <td className="p-4 text-slate-400">
                                        {new Date(v.created_at).toLocaleString('es-ES', { 
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute:'2-digit'
                                        })}
                                    </td>
                                    <td className="p-4">
                                        <p className="font-medium text-white text-lg">{v.cliente}</p>
                                        {v.comentario && <p className="text-xs text-sky-400 mt-1 italic">"{v.comentario}"</p>}
                                    </td>
                                    <td className="p-4 text-slate-300">
                                        <ul className="list-disc list-inside">
                                            {v.productos_vendidos.map((prod, i) => (
                                                <li key={i}>
                                                    <span className="text-teal-400 font-bold">{prod.cantidad}x</span> {prod.nombre} <span className="text-slate-500">({prod.marca})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="p-4 font-bold text-slate-300 text-xl text-right">${v.total.toFixed(2)}</td>
                                    
                                    <td className="p-4 text-right">
                                        {v.estado_pago === 'Pendiente' ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-emerald-400 text-sm font-semibold">Abonó: ${(v.abono || 0).toFixed(2)}</span>
                                                <span className="text-rose-400 font-bold mt-1">
                                                    Debe: ${(v.total - (v.abono || 0)).toFixed(2)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-emerald-500 text-sm font-semibold">Total Cancelado</span>
                                        )}
                                    </td>

                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            {v.estado_pago === 'Pendiente' ? (
                                                <>
                                                    <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 px-3 py-1 rounded-full text-xs font-bold">
                                                        ⏳ Reserva / Debe
                                                    </span>
                                                    <button 
                                                        onClick={() => marcarComoPagado(v)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-bold transition-colors"
                                                    >
                                                        Pagar Saldo
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-3 py-1 rounded-full text-xs font-bold">
                                                    ✅ Completo
                                                </span>
                                            )}
                                            
                                            <div className="flex gap-2 mt-2">
                                                <button 
                                                    onClick={() => iniciarEdicionVenta(v)} 
                                                    className="bg-indigo-600/50 hover:bg-indigo-600 text-white border border-indigo-500 text-xs px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1"
                                                >
                                                    ✏️ Cargar/Editar
                                                </button>
                                                <button 
                                                    onClick={() => anularVentaYDovolverStock(v)} 
                                                    className="bg-rose-900/50 hover:bg-rose-600 text-white border border-rose-700 text-xs px-2 py-1 rounded transition-colors"
                                                    title="Anular venta por completo"
                                                >
                                                    💥
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {ventasHistorial.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500 text-lg">
                                        No hay historial de ventas. ¡Registra la primera arriba!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </main>
    )
}
