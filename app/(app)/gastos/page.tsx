'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, Upload, FileText, X, Receipt, Pencil } from 'lucide-react'
import { getSession, hasEditPerm } from '@/lib/session'

const CATEGORIES = ['Combustible', 'Mantenimiento', 'Seguros', 'Amarres', 'Limpieza', 'Repuestos', 'Personal', 'Patrón', 'Broker', 'Marketing', 'Administrativo', 'Bebidas', 'Otro']

const inputCls = 'w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50'
const labelCls = 'text-gray-700 text-xs mb-1.5 block'

const emptyForm = () => ({
  amount: '', boat_id: '', concept: '', category: '', date: new Date().toISOString().slice(0, 10),
  notes: '', receipt_url: '', assigned_to: '',
})

export default function GastosPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [boats, setBoats]       = useState<any[]>([])
  const [socios, setSocios]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterBoat, setFilterBoat] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [session] = useState(() => getSession())
  const canEdit = hasEditPerm(session, 'gastos')

  const [form, setForm] = useState(emptyForm())
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { load() }, [])

  async function load() {
    const sess    = getSession()
    const isSocio = sess?.role === 'socio'
    const boatIds = sess?.boatIds ?? []
    const hasLimit = isSocio && boatIds.length > 0

    const supabase = createClient()
    let expQ = supabase.from('expenses').select('*, boat:boats(name)').order('date', { ascending: false })
    if (hasLimit) expQ = expQ.in('boat_id', boatIds)

    let boatsQ = supabase.from('boats').select('id,name').order('name')
    if (hasLimit) boatsQ = boatsQ.in('id', boatIds)

    const sociosQ = supabase.from('staff_users').select('id,name').eq('role', 'socio').eq('active', true).order('name')

    const [{ data: exp }, { data: b }, { data: s }] = await Promise.all([expQ, boatsQ, sociosQ])
    const socioList = s ?? []
    const enriched = (exp ?? []).map((e: any) => ({
      ...e,
      assignee: socioList.find((u: any) => u.id === e.assigned_to) ?? null,
    }))
    setExpenses(enriched)
    setBoats(b ?? [])
    setSocios(socioList)
    setLoading(false)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `receipts/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('boat-images').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('boat-images').getPublicUrl(path)
      set('receipt_url', publicUrl)
    }
    setUploading(false)
  }

  function openNew() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(e: any) {
    setEditingId(e.id)
    setForm({
      amount: String(e.amount ?? ''),
      boat_id: e.boat_id ?? '',
      concept: e.concept ?? '',
      category: e.category ?? '',
      date: e.date ?? new Date().toISOString().slice(0, 10),
      notes: e.notes ?? '',
      receipt_url: e.receipt_url ?? '',
      assigned_to: e.assigned_to ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleSave() {
    if (!form.amount || !form.concept || !form.date) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      amount: Number(form.amount),
      boat_id: form.boat_id || null,
      concept: form.concept,
      category: form.category || null,
      date: form.date,
      notes: form.notes || null,
      receipt_url: form.receipt_url || null,
      assigned_to: form.assigned_to || null,
    }
    let error: any
    if (editingId) {
      ;({ error } = await supabase.from('expenses').update(payload).eq('id', editingId))
    } else {
      ;({ error } = await supabase.from('expenses').insert(payload))
    }
    if (error) {
      alert('Error al guardar: ' + error.message)
      setSaving(false)
      return
    }
    closeForm()
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const filtered = expenses.filter(e => {
    const matchBoat  = !filterBoat  || e.boat_id === filterBoat
    const matchMonth = !filterMonth || e.date?.startsWith(filterMonth)
    return matchBoat && matchMonth
  })

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount ?? 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-xl">Gastos</h1>
          <p className="text-gray-700 text-sm mt-0.5">Registro de gastos operativos</p>
        </div>
        {canEdit && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors">
            <Plus size={15} /> Nuevo gasto
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white border border-[#C9A84C]/30 rounded-xl p-5 space-y-4">
          <h3 className="text-gray-900 font-semibold text-sm">{editingId ? 'Editar gasto' : 'Registrar gasto'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Importe (€) *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Concepto *</label>
              <input value={form.concept} onChange={e => set('concept', e.target.value)} className={inputCls} placeholder="Descripción del gasto" />
            </div>
            <div>
              <label className={labelCls}>Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                <option value="">Sin categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Embarcación</label>
              <select value={form.boat_id} onChange={e => set('boat_id', e.target.value)} className={inputCls}>
                <option value="">General / Sin barco</option>
                {boats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Asignar gasto a</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className={inputCls}>
                <option value="">Sin asignar (dividir por %)</option>
                <option value="blackboats">Black Boats</option>
                {socios.map(s => <option key={s.id} value={s.id}>{s.name} (socio)</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Notas</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={1} className={inputCls + ' resize-none'} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Justificante (foto / PDF)</label>
              {form.receipt_url ? (
                <div className="flex items-center gap-3 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                  <FileText size={16} className="text-[#C9A84C] flex-shrink-0" />
                  <a href={form.receipt_url} target="_blank" rel="noopener noreferrer"
                    className="text-[#C9A84C] text-xs hover:underline flex-1 truncate">Ver justificante</a>
                  <button onClick={() => set('receipt_url', '')} className="text-gray-700 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full py-3 border-2 border-dashed border-gray-200 hover:border-[#C9A84C]/40 rounded-lg flex items-center justify-center gap-2 text-gray-700 hover:text-gray-700 text-sm transition-colors">
                  {uploading
                    ? <div className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                    : <><Upload size={15} /> Subir justificante</>}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={closeForm} className="px-3 py-2 text-gray-700 hover:text-gray-900 text-sm transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.amount || !form.concept}
              className="px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] disabled:opacity-60 text-black text-sm font-semibold rounded-lg transition-colors">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar gasto'}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterBoat} onChange={e => setFilterBoat(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#C9A84C]/50">
          <option value="">Todos los barcos</option>
          {boats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#C9A84C]/50" />
        {(filterBoat || filterMonth) && (
          <button onClick={() => { setFilterBoat(''); setFilterMonth('') }} className="text-gray-700 hover:text-gray-900 text-sm transition-colors">
            Limpiar filtros
          </button>
        )}
        {filtered.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-gray-700 text-sm">Total:</span>
            <span className="text-gray-900 font-bold">{totalFiltered.toLocaleString('es-ES')}€</span>
          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <Receipt size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-700 text-sm">No hay gastos registrados</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-700 text-xs font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-700 text-xs font-medium">Concepto</th>
                <th className="text-left px-4 py-3 text-gray-700 text-xs font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-gray-700 text-xs font-medium">Barco</th>
                <th className="text-left px-4 py-3 text-gray-700 text-xs font-medium">Asignado a</th>
                <th className="text-right px-4 py-3 text-gray-700 text-xs font-medium">Importe</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                    {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900 text-sm">{e.concept}</p>
                    {e.notes && <p className="text-gray-700 text-xs mt-0.5">{e.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {e.category
                      ? <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">{e.category}</span>
                      : <span className="text-gray-700 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{e.boat?.name ?? <span className="text-gray-700">General</span>}</td>
                  <td className="px-4 py-3 text-xs">
                    {e.assigned_to === 'blackboats'
                      ? <span className="px-2 py-0.5 bg-[#C9A84C]/10 text-[#C9A84C] rounded-full border border-[#C9A84C]/20">Black Boats</span>
                      : e.assignee
                        ? <span className="px-2 py-0.5 bg-sky-400/10 text-sky-400 rounded-full border border-sky-400/20">{e.assignee.name}</span>
                        : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-400 font-semibold">-{Number(e.amount).toLocaleString('es-ES')}€</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {e.receipt_url && (
                        <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                          className="text-gray-700 hover:text-[#C9A84C] transition-colors" title="Ver justificante">
                          <FileText size={14} />
                        </a>
                      )}
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(e)} className="text-gray-700 hover:text-[#C9A84C] transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(e.id)} className="text-gray-700 hover:text-red-400 transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
