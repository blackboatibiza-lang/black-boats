'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getSession, hasEditPerm } from '@/lib/session'

export default function ExtrasPage() {
  const [extras, setExtras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit] = useState(() => hasEditPerm(getSession(), 'extras'))

  useEffect(() => {
    const supabase = createClient()
    supabase.from('extras').select('*').order('name').then(({ data }) => {
      setExtras(data ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors">
            <Plus size={16} /> Nuevo extra
          </button>
        </div>
      )}

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left px-5 py-3.5 text-gray-500 font-medium text-xs">Servicio</th>
              <th className="text-left px-5 py-3.5 text-gray-500 font-medium text-xs">Descripción</th>
              <th className="text-left px-5 py-3.5 text-gray-500 font-medium text-xs">Precio</th>
              <th className="text-left px-5 py-3.5 text-gray-500 font-medium text-xs">Unidad</th>
              <th className="text-left px-5 py-3.5 text-gray-500 font-medium text-xs">Estado</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E1E1E]">
            {extras.map(extra => (
              <tr key={extra.id} className="hover:bg-[#1A1A1A] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-[#C9A84C]" />
                    <span className="text-white font-medium">{extra.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-400">{extra.description ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <span className="text-[#C9A84C] font-semibold">
                    {Number(extra.price) === 0 ? 'Variable' : `${Number(extra.price)}€`}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-400">{extra.unit}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${extra.is_active ? 'text-green-400 bg-green-400/10' : 'text-gray-500 bg-gray-500/10'}`}>
                    {extra.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-5 py-3.5">
                    <button className="text-gray-500 hover:text-[#C9A84C] transition-colors">
                      <Pencil size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
