'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { setSession } from '@/lib/session'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('staff_users')
      .select('id,name,email,role,active,password_hash')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (err || !data) {
      setLoading(false)
      setError('Email o contraseña incorrectos')
      return
    }

    const valid = data.password_hash === btoa(password) || data.password_hash === password
    if (!valid) {
      setLoading(false)
      setError('Email o contraseña incorrectos')
      return
    }

    if (!data.active) {
      setLoading(false)
      setError('Tu cuenta está desactivada. Contacta al administrador.')
      return
    }

    const [{ data: boatAccess }, { data: permsData }] = await Promise.all([
      supabase.from('staff_boat_access').select('boat_id').eq('user_id', data.id),
      supabase.from('staff_permissions').select('module').eq('user_id', data.id),
    ])
    const boatIds     = (boatAccess ?? []).map((r: any) => r.boat_id)
    const permissions = (permsData ?? []).map((r: any) => r.module)

    setSession({ id: data.id, name: data.name, email: data.email, role: data.role, boatIds, permissions })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <img src="/logo.jpg" alt="Black Boats Ibiza" className="h-28 w-auto object-contain" />
        </div>

        <form onSubmit={handleLogin} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-7 space-y-5">
          <div>
            <h2 className="text-white font-semibold text-lg mb-1">Iniciar sesión</h2>
            <p className="text-gray-500 text-sm">Accede al panel de gestión</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-500 text-xs">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-500 text-xs">Contraseña</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 pr-10 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#C9A84C] text-black font-semibold text-sm rounded-lg hover:bg-[#D4B05A] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading
              ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Entrando...</>
              : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">Black Boats Ibiza © 2025</p>
      </div>
    </div>
  )
}
