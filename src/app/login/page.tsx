"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Login() {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        const { error } = await supabase.auth.signInWithPassword({
            email: "glare@admin.com", // ← Correo ligado a esta contraseña local
            password: password,
        })

        if (error) {
            alert("Contraseña incorrecta")
        } else {
            router.push("/dashboard")
        }
        setLoading(false)
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            {/* Background design */}
            <div className="absolute inset-0 overflow-hidden z-[-1]">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/30 rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>
            </div>

            <form onSubmit={handleLogin} className="glass-panel rounded-2xl p-8 shadow-2xl w-full max-w-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                    <span className="text-3xl">🔐</span>
                </div>
                
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
                    GlareShop
                </h2>
                <p className="text-slate-400 text-sm mb-8 text-center">Acceso administrativo</p>

                <div className="w-full mb-8">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña Admin</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-500/25 flex justify-center items-center gap-2"
                >
                    {loading ? "Verificando..." : "Ingresar"}
                </button>
            </form>
        </main>
    )
}