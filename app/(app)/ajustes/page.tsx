'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Building2, Users, Shield, Save, Plus, Trash2,
  CheckCircle, X, Pencil, Eye, EyeOff, RefreshCw,
} from 'lucide-react'

type Tab = 'empresa' | 'usuarios' | 'permisos'

const ROLES = [
  {
    value: 'admin',
    label: 'Administrador',
    desc: 'Acceso total al sistema, usuarios incluidos',
    color: 'text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/30',
  },
  {
    value: 'socio',
    label: 'Socio',
    desc: 'Solo ve reservas e ingresos de su propio barco',
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  },
  {
    value: 'empleado',
    label: 'Empleado',
    desc: 'Acceso completo excepto usuarios y facturación',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  },
]

const ALL_PERMISSIONS = [
  { key: 'dashboard',   label: 'Dashboard',   group: 'general',   canEdit: false },
  { key: 'flota',       label: 'Flota',       group: 'operacion', canEdit: true  },
  { key: 'reservas',    label: 'Reservas',    group: 'operacion', canEdit: true  },
  { key: 'clientes',    label: 'Clientes',    group: 'operacion', canEdit: true  },
  { key: 'extras',      label: 'Extras',      group: 'operacion', canEdit: true  },
  { key: 'gastos',      label: 'Gastos',      group: 'operacion', canEdit: true  },
  { key: 'facturacion', label: 'Facturación', group: 'admin',     canEdit: true  },
  { key: 'informes',    label: 'Informes',    group: 'admin',     canEdit: false },
  { key: 'ajustes',     label: 'Ajustes',     group: 'admin',     canEdit: true  },
]

const EDIT_KEYS = ALL_PERMISSIONS.filter(p => p.canEdit).map(p => `${p.key}:edit`)

const ROLE_DEFAULTS: Record<string, string[]> = {
  admin:    [...ALL_PERMISSIONS.map(p => p.key), ...EDIT_KEYS],
  socio:    ['dashboard', 'reservas', 'facturacion', 'gastos', 'informes'],
  empleado: ['dashboard', 'flota', 'flota:edit', 'reservas', 'reservas:edit', 'clientes', 'clientes:edit', 'extras', 'extras:edit', 'gastos', 'gastos:edit'],
}

const inputCls = "w-full px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50"
const labelCls = "text-gray-400 text-xs mb-1.5 block"

// ── EMPRESA ──────────────────────────────────────────────────────
function EmpresaTab() {
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [data, setData] = useState({
    nombre:       'Black Boats Ibiza S.L.',
    cif:          'B-XXXXXXXX',
    direccion:    'Puerto Deportivo San Antonio, Local 5, 07820 Ibiza',
    telefono:     '+34 971 000 000',
    email:        'info@blackboatsibiza.com',
    web:          'www.blackboatsibiza.com',
    iban:         'ES00 0000 0000 0000 0000 0000',
    logo_url:     '',
    temporada_inicio: '05-01',
    temporada_fin:    '10-31',
    moneda:       'EUR',
    iva:          '21',
    notas_factura:'Gracias por confiar en Black Boats Ibiza.',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('app_settings').select('key,value').then(({ data: rows }) => {
      if (!rows?.length) return
      const map: Record<string, string> = {}
      rows.forEach(r => { map[r.key] = r.value })
      setData(prev => ({ ...prev, ...map }))
    })
  }, [])

  function set(k: string, v: string) { setData(prev => ({ ...prev, [k]: v })) }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const rows = Object.entries(data).map(([key, value]) => ({ key, value }))
    await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Datos de la empresa</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={labelCls}>Nombre / Razón social</label><input value={data.nombre} onChange={e => set('nombre', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>CIF / NIF</label><input value={data.cif} onChange={e => set('cif', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Teléfono</label><input value={data.telefono} onChange={e => set('telefono', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input value={data.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Web</label><input value={data.web} onChange={e => set('web', e.target.value)} className={inputCls} /></div>
          <div className="col-span-2"><label className={labelCls}>Dirección</label><input value={data.direccion} onChange={e => set('direccion', e.target.value)} className={inputCls} /></div>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Datos bancarios</h3>
        <div>
          <label className={labelCls}>IBAN</label>
          <input value={data.iban} onChange={e => set('iban', e.target.value)} className={inputCls} placeholder="ES00 0000 0000 0000 0000 0000" />
        </div>
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Configuración de facturación</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>IVA por defecto (%)</label>
            <input type="number" value={data.iva} onChange={e => set('iva', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Moneda</label>
            <select value={data.moneda} onChange={e => set('moneda', e.target.value)} className={inputCls}>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — Dólar</option>
              <option value="GBP">GBP — Libra</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Nota por defecto en facturas</label>
            <textarea value={data.notas_factura} onChange={e => set('notas_factura', e.target.value)} rows={2}
              className={inputCls + ' resize-none'} />
          </div>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Temporada</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Inicio temporada (MM-DD)</label>
            <input value={data.temporada_inicio} onChange={e => set('temporada_inicio', e.target.value)} placeholder="05-01" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fin temporada (MM-DD)</label>
            <input value={data.temporada_fin} onChange={e => set('temporada_fin', e.target.value)} placeholder="10-31" className={inputCls} />
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-all">
        {saving
          ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Guardando...</>
          : saved
          ? <><CheckCircle size={16} /> Guardado</>
          : <><Save size={16} /> Guardar cambios</>}
      </button>
    </div>
  )
}

// ── USUARIOS ─────────────────────────────────────────────────────
function UsuariosTab() {
  const [users, setUsers]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [editId, setEditId]   = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    name: '', email: '', role: 'empleado', password: '', active: true,
  })

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const supabase = createClient()
    const { data } = await supabase.from('staff_users').select('*').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  function resetForm() {
    setForm({ name: '', email: '', role: 'empleado', password: '', active: true })
    setEditId(null); setShowForm(false); setError('')
  }

  function startEdit(u: any) {
    setForm({ name: u.name, email: u.email, role: u.role, password: '', active: u.active })
    setEditId(u.id); setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.email) { setError('Nombre y email son obligatorios'); return }
    if (!editId && !form.password) { setError('La contraseña es obligatoria para nuevos usuarios'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const payload: any = { name: form.name, email: form.email, role: form.role, active: form.active }
    if (form.password) payload.password_hash = btoa(form.password) // simple hash placeholder
    if (editId) {
      const { error: e } = await supabase.from('staff_users').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('staff_users').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    await loadUsers(); resetForm(); setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('staff_users').update({ active: !active }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !active } : u))
  }

  async function deleteUser(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return
    const supabase = createClient()
    await supabase.from('staff_users').delete().eq('id', id)
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    setForm(p => ({ ...p, password: Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }))
  }

  const roleInfo: Record<string, typeof ROLES[0]> = Object.fromEntries(ROLES.map(r => [r.value, r]))

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-all">
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-[#141414] border border-[#C9A84C]/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">{editId ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre completo *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Ana García" />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="ana@blackboats.com" />
            </div>
            <div>
              <label className={labelCls}>Rol</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Contraseña {editId ? '(dejar en blanco para no cambiar)' : '*'}</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className={inputCls + ' pr-8'}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button type="button" onClick={genPassword} title="Generar contraseña"
                  className="px-2.5 border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-[#C9A84C]/30 transition-all">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="w-4 h-4 accent-[#C9A84C]" />
            Usuario activo
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-all">
              {saving ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Guardando...</> : <><CheckCircle size={14} /> {editId ? 'Guardar cambios' : 'Crear usuario'}</>}
            </button>
            <button onClick={resetForm} className="px-4 py-2 border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition-all">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">No hay usuarios registrados</div>
        ) : (
          <div className="divide-y divide-[#1E1E1E]">
            {users.map(u => {
              const r = roleInfo[u.role]
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#C9A84C] font-bold text-sm flex-shrink-0">
                    {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{u.name}</p>
                      {!u.active && <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Inactivo</span>}
                    </div>
                    <p className="text-gray-500 text-xs">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${r?.color ?? 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                    {r?.label ?? u.role}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleActive(u.id, u.active)}
                      title={u.active ? 'Desactivar' : 'Activar'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all
                        ${u.active ? 'border-[#2A2A2A] text-gray-500 hover:text-yellow-400 hover:border-yellow-400/30' : 'border-green-400/30 text-green-400 hover:bg-green-400/10'}`}>
                      {u.active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => startEdit(u)}
                      className="w-8 h-8 rounded-lg border border-[#2A2A2A] text-gray-500 hover:text-white hover:border-[#C9A84C]/30 flex items-center justify-center transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteUser(u.id)}
                      className="w-8 h-8 rounded-lg border border-[#2A2A2A] text-gray-500 hover:text-red-400 hover:border-red-400/30 flex items-center justify-center transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── PERMISOS ──────────────────────────────────────────────────────
type BoatRow = { boat_id: string; profit_percentage: number; expense_percentage: number }

function PermisosTab() {
  const [users, setUsers]           = useState<any[]>([])
  const [boats, setBoats]           = useState<any[]>([])
  const [perms, setPerms]           = useState<Record<string, string[]>>({})
  // userId → { boat_id, profit_percentage, expense_percentage }[]
  const [boatAccess, setBoatAccess] = useState<Record<string, BoatRow[]>>({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState<string | null>(null)
  const [saved, setSaved]           = useState<string | null>(null)
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({})

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const [{ data: u }, { data: p }, { data: b }, { data: ba }] = await Promise.all([
      supabase.from('staff_users').select('id,name,role,active').order('name'),
      supabase.from('staff_permissions').select('*'),
      supabase.from('boats').select('id,name').order('name'),
      supabase.from('staff_boat_access').select('*'),
    ])
    const users = u ?? []
    setUsers(users)
    setBoats(b ?? [])
    const map: Record<string, string[]> = {}
    users.forEach(usr => {
      const userPerms = (p ?? []).filter((r: any) => r.user_id === usr.id).map((r: any) => r.module)
      map[usr.id] = userPerms.length > 0 ? userPerms : (ROLE_DEFAULTS[usr.role] ?? [])
    })
    setPerms(map)
    const baMap: Record<string, BoatRow[]> = {}
    users.forEach(usr => {
      baMap[usr.id] = (ba ?? [])
        .filter((r: any) => r.user_id === usr.id)
        .map((r: any) => ({ boat_id: r.boat_id, profit_percentage: r.profit_percentage ?? 50, expense_percentage: r.expense_percentage ?? 50 }))
    })
    setBoatAccess(baMap)
    setLoading(false)
  }

  function togglePerm(userId: string, module: string) {
    setPerms(prev => {
      const current = prev[userId] ?? []
      const has = current.includes(module)
      return { ...prev, [userId]: has ? current.filter(m => m !== module) : [...current, module] }
    })
  }

  function toggleBoat(userId: string, boatId: string) {
    setBoatAccess(prev => {
      const current = prev[userId] ?? []
      const has = current.some(r => r.boat_id === boatId)
      return {
        ...prev,
        [userId]: has
          ? current.filter(r => r.boat_id !== boatId)
          : [...current, { boat_id: boatId, profit_percentage: 50, expense_percentage: 50 }],
      }
    })
  }

  function updateBoatPct(userId: string, boatId: string, field: 'profit_percentage' | 'expense_percentage', val: number) {
    setBoatAccess(prev => ({
      ...prev,
      [userId]: (prev[userId] ?? []).map(r => r.boat_id === boatId ? { ...r, [field]: val } : r),
    }))
  }

  function selectAllBoats(userId: string) {
    setBoatAccess(prev => ({
      ...prev,
      [userId]: boats.map(b => {
        const existing = (prev[userId] ?? []).find(r => r.boat_id === b.id)
        return existing ?? { boat_id: b.id, profit_percentage: 50, expense_percentage: 50 }
      }),
    }))
  }

  function clearBoats(userId: string) {
    setBoatAccess(prev => ({ ...prev, [userId]: [] }))
  }

  function applyRoleDefaults(userId: string, role: string) {
    setPerms(prev => ({ ...prev, [userId]: ROLE_DEFAULTS[role] ?? [] }))
  }

  async function savePerms(userId: string) {
    setSaving(userId)
    const supabase = createClient()
    await supabase.from('staff_permissions').delete().eq('user_id', userId)
    const modules = perms[userId] ?? []
    if (modules.length > 0) {
      await supabase.from('staff_permissions').insert(modules.map(m => ({ user_id: userId, module: m })))
    }
    await supabase.from('staff_boat_access').delete().eq('user_id', userId)
    const boatRows = boatAccess[userId] ?? []
    if (boatRows.length > 0) {
      await supabase.from('staff_boat_access').insert(
        boatRows.map(r => ({ user_id: userId, boat_id: r.boat_id, profit_percentage: r.profit_percentage, expense_percentage: r.expense_percentage }))
      )
    }
    setSaving(null); setSaved(userId)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /></div>

  if (users.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500 text-sm">
        Primero crea usuarios en la pestaña <span className="text-[#C9A84C]">Usuarios</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {users.map(u => {
        const userPerms  = perms[u.id] ?? []
        const userBoatRows = boatAccess[u.id] ?? []
        const userBoatIds  = userBoatRows.map(r => r.boat_id)
        const isSaving   = saving === u.id
        const isSaved    = saved  === u.id
        const isExpanded = expanded[u.id] ?? false
        const allBoats   = userBoatIds.length === boats.length && boats.length > 0
        return (
          <div key={u.id} className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#C9A84C] text-xs font-bold">
                  {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{u.name}</p>
                  <p className="text-gray-500 text-xs capitalize">{u.role}{!u.active ? ' · Inactivo' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={e => e.target.value && applyRoleDefaults(u.id, e.target.value)}
                  defaultValue=""
                  className="px-2 py-1.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-xs text-gray-400 focus:outline-none focus:border-[#C9A84C]/50">
                  <option value="" disabled>Aplicar preset de rol</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={() => savePerms(u.id)} disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-medium rounded-lg hover:bg-[#C9A84C]/20 transition-all disabled:opacity-60">
                  {isSaving
                    ? <><div className="w-3 h-3 border border-[#C9A84C] border-t-transparent rounded-full animate-spin" /> Guardando</>
                    : isSaved
                    ? <><CheckCircle size={12} /> Guardado</>
                    : <><Save size={12} /> Guardar</>}
                </button>
              </div>
            </div>

            {/* Módulos */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {ALL_PERMISSIONS.map(p => {
                const has     = userPerms.includes(p.key)
                const editKey = `${p.key}:edit`
                const canEdit = has && p.canEdit && userPerms.includes(editKey)
                return (
                  <div key={p.key} className={`rounded-lg border transition-all ${has ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5' : 'border-[#2A2A2A]'}`}>
                    {/* Fila acceso */}
                    <button onClick={() => {
                      togglePerm(u.id, p.key)
                      // Si se quita acceso, quitar también edición
                      if (has && p.canEdit && userPerms.includes(editKey)) togglePerm(u.id, editKey)
                    }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-left transition-colors
                        ${has ? 'text-[#C9A84C]' : 'text-gray-500 hover:text-gray-300'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${has ? 'bg-[#C9A84C]' : 'bg-[#3A3A3A]'}`} />
                      {p.label}
                    </button>
                    {/* Fila edición — solo si tiene acceso y el módulo lo soporta */}
                    {has && p.canEdit && (
                      <button onClick={() => togglePerm(u.id, editKey)}
                        className={`flex items-center gap-1.5 w-full px-3 pb-2 text-[10px] transition-colors
                          ${canEdit ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}>
                        {canEdit ? <Pencil size={10} /> : <Eye size={10} />}
                        {canEdit ? 'Puede editar' : 'Solo lectura'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Acceso a embarcaciones */}
            {boats.length > 0 && (
              <div className="border-t border-[#2A2A2A]">
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [u.id]: !isExpanded }))}
                  className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-400 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Acceso a embarcaciones</span>
                    {allBoats
                      ? <span className="text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-2 py-0.5 rounded-full">Todas</span>
                      : userBoatIds.length > 0
                      ? <span className="text-sky-400 bg-sky-400/10 border border-sky-400/30 px-2 py-0.5 rounded-full">{userBoatIds.length} asignada{userBoatIds.length !== 1 ? 's' : ''}</span>
                      : <span className="text-gray-600 bg-[#1E1E1E] border border-[#2A2A2A] px-2 py-0.5 rounded-full">Sin restricción</span>
                    }
                  </div>
                  <span className="text-[10px] text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-4 space-y-2">
                    <p className="text-gray-600 text-xs mb-3">
                      Si no se asigna ninguna embarcación, el usuario puede ver todas. Si se asignan, solo verá datos de las seleccionadas.
                    </p>
                    <div className="flex gap-2 mb-3">
                      <button onClick={() => selectAllBoats(u.id)}
                        className="text-xs px-2.5 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-[#3A3A3A] transition-all">
                        Todas
                      </button>
                      <button onClick={() => clearBoats(u.id)}
                        className="text-xs px-2.5 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white hover:border-[#3A3A3A] transition-all">
                        Ninguna
                      </button>
                    </div>
                    <div className="space-y-2">
                      {boats.map(boat => {
                        const hasBoat = userBoatIds.includes(boat.id)
                        const row = userBoatRows.find(r => r.boat_id === boat.id)
                        return (
                          <div key={boat.id} className={`rounded-lg border transition-all ${hasBoat ? 'border-sky-400/40 bg-sky-400/5' : 'border-[#2A2A2A]'}`}>
                            <button onClick={() => toggleBoat(u.id, boat.id)}
                              className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-left ${hasBoat ? 'text-sky-400' : 'text-gray-500 hover:text-gray-300'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasBoat ? 'bg-sky-400' : 'bg-[#3A3A3A]'}`} />
                              {boat.name}
                            </button>
                            {hasBoat && row && (
                              <div className="px-3 pb-2.5 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-gray-500 text-[10px] block mb-1">% ganancia socio</label>
                                  <div className="flex items-center gap-1">
                                    <input type="number" min={0} max={100} step={1}
                                      value={row.profit_percentage}
                                      onChange={e => updateBoatPct(u.id, boat.id, 'profit_percentage', Number(e.target.value))}
                                      className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-white focus:outline-none focus:border-sky-400/50" />
                                    <span className="text-gray-500 text-xs">%</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-gray-500 text-[10px] block mb-1">% gastos socio</label>
                                  <div className="flex items-center gap-1">
                                    <input type="number" min={0} max={100} step={1}
                                      value={row.expense_percentage}
                                      onChange={e => updateBoatPct(u.id, boat.id, 'expense_percentage', Number(e.target.value))}
                                      className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-white focus:outline-none focus:border-sky-400/50" />
                                    <span className="text-gray-500 text-xs">%</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Tabla referencia de roles */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Referencia de roles</h3>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(r => (
            <div key={r.value} className="flex items-start gap-2.5">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                ${r.value === 'admin' ? 'bg-[#C9A84C]' : r.value === 'socio' ? 'bg-violet-400' : r.value === 'empleado' ? 'bg-blue-400' : 'bg-gray-400'}`} />
              <div>
                <p className="text-white text-xs font-medium">{r.label}</p>
                <p className="text-gray-500 text-xs">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── PAGE ──────────────────────────────────────────────────────────
export default function AjustesPage() {
  const [tab, setTab] = useState<Tab>('empresa')

  const tabs = [
    { id: 'empresa',  label: 'Datos de empresa', icon: Building2 },
    { id: 'usuarios', label: 'Usuarios',          icon: Users },
    { id: 'permisos', label: 'Permisos',          icon: Shield },
  ] as const

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#141414] border border-[#2A2A2A] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[#C9A84C] text-black' : 'text-gray-400 hover:text-white'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'empresa'  && <EmpresaTab />}
      {tab === 'usuarios' && <UsuariosTab />}
      {tab === 'permisos' && <PermisosTab />}
    </div>
  )
}
