'use client'

import { useState, useEffect } from 'react'
import { Plus, Phone, Mail, Award, AlertCircle, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const roleColors: Record<string, string> = {
  'captain':   'text-[#C9A84C] bg-[#C9A84C]/10',
  'Capitán':   'text-[#C9A84C] bg-[#C9A84C]/10',
  'hostess':   'text-pink-400 bg-pink-400/10',
  'Hostess':   'text-pink-400 bg-pink-400/10',
  'mechanic':  'text-blue-400 bg-blue-400/10',
  'Mecánico':  'text-blue-400 bg-blue-400/10',
}

export default function TripulacionPage() {
  const [crew, setCrew] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('crew').select('*').order('last_name').then(({ data }) => {
      setCrew(data ?? [])
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
      <div className="flex justify-end">
        <Link
          href="/tripulacion/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} /> Añadir miembro
        </Link>
      </div>

      {crew.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <UserCheck size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-700">No hay personal registrado todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {crew.map(member => {
            const licExpirySoon = member.license_expiry &&
              new Date(member.license_expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            const roleColor = roleColors[member.role] ?? 'text-gray-700 bg-gray-400/10'
            return (
              <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-[#C9A84C] font-bold">
                      {member.first_name[0]}{member.last_name[0]}
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold">{member.first_name} {member.last_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${member.is_active ? 'bg-green-400' : 'bg-gray-600'}`} />
                </div>
                <div className="space-y-1.5 mb-4">
                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <Phone size={12} /> {member.phone}
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <Mail size={12} /> {member.email}
                    </div>
                  )}
                  {member.license_number && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <Award size={12} /> {member.license_number}
                      {licExpirySoon && <AlertCircle size={11} className="text-yellow-400" />}
                    </div>
                  )}
                </div>
                {member.license_expiry && (
                  <div className={`text-xs pt-3 border-t border-gray-200 ${licExpirySoon ? 'text-yellow-400' : 'text-gray-700'}`}>
                    Licencia vence: {new Date(member.license_expiry).toLocaleDateString('es-ES')}
                    {licExpirySoon && ' ⚠'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
