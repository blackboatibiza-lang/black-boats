'use client'

import { useState, useEffect } from 'react'
import { CreditCard, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const methodLabels: Record<string, string> = {
  card: 'Tarjeta', transfer: 'Transferencia', cash: 'Efectivo', stripe: 'Stripe',
}

export default function PagosPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('payments')
      .select('*, booking:bookings(booking_number, client:clients(first_name, last_name))')
      .order('payment_date', { ascending: false })
      .then(({ data }) => {
        setPayments(data ?? [])
        setLoading(false)
      })
  }, [])

  const totalRecibido = payments.reduce((s, p) => s + Number(p.amount), 0)
  const completados = payments.filter(p => !p.is_deposit).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-[#C9A84C]" />
            </div>
            <span className="text-gray-700 text-xs">Total recibido</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{totalRecibido.toLocaleString('es-ES')}€</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Clock size={16} className="text-blue-400" />
            </div>
            <span className="text-gray-700 text-xs">Depósitos</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{payments.filter(p => p.is_deposit).length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center">
              <CheckCircle size={16} className="text-green-400" />
            </div>
            <span className="text-gray-700 text-xs">Pagos totales</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{completados}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-gray-900 font-semibold text-sm">Historial de pagos</h3>
        </div>
        {payments.length === 0 ? (
          <div className="text-center py-16 text-gray-700">No hay pagos registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Reserva</th>
                <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Cliente</th>
                <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Importe</th>
                <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Método</th>
                <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Fecha</th>
                <th className="text-left px-5 py-3.5 text-gray-700 font-medium text-xs">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map(p => {
                const clientName = p.booking?.client
                  ? `${p.booking.client.first_name} ${p.booking.client.last_name}`
                  : '—'
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[#C9A84C] font-mono text-xs">
                        {p.booking?.booking_number ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-900">{clientName}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-gray-900 font-semibold">{Number(p.amount).toLocaleString('es-ES')}€</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <CreditCard size={13} />
                        {methodLabels[p.method] ?? p.method}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {new Date(p.payment_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_deposit ? 'text-blue-400 bg-blue-400/10' : 'text-green-400 bg-green-400/10'}`}>
                        {p.is_deposit ? 'Depósito' : 'Total'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
