'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Pencil, Check, X, Info } from 'lucide-react'

const SEASON_LABELS: Record<string, string> = {
  MAY_OCT: 'May / Oct',
  JUN_SEP: 'Jun / Sep',
  JUL_AGO: 'Jul / Ago',
  JUN: 'Junio',
  JUL: 'Julio',
  AGO: 'Agosto',
  SEP: 'Septiembre',
}

const TARIFF_LABELS: Record<string, { label: string; color: string }> = {
  sin_incluido: { label: 'Sin patrón ni fuel',     color: 'text-gray-300' },
  patron_fuel:  { label: 'Patrón + Fuel incluido', color: 'text-[#C9A84C]' },
  es_vedra:     { label: 'Es Vedrà (Full Day)',     color: 'text-blue-400' },
  formentera:   { label: 'Formentera (Full Day)',   color: 'text-purple-400' },
}

const DURATION_LABELS: Record<string, string> = {
  half: 'Medio día',
  full: 'Día completo',
}

// Orden de temporadas para mostrar
const SEASON_ORDER = ['MAY_OCT', 'JUN_SEP', 'JUN', 'JUL', 'AGO', 'SEP', 'JUL_AGO']

function PriceCell({ row, onSave }: { row: any; onSave: (id: string, price: number, fuel_extra: number | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(String(row.price))
  const [fuel, setFuel] = useState(row.fuel_extra ? String(row.fuel_extra) : '')

  function save() {
    onSave(row.id, Number(price), fuel ? Number(fuel) : null)
    setEditing(false)
  }

  if (editing) {
    return (
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-20 px-2 py-1 bg-[#0A0A0A] border border-[#C9A84C]/50 rounded text-white text-xs text-right focus:outline-none"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <span className="text-gray-500 text-xs">€</span>
          {row.fuel_extra !== null && (
            <>
              <span className="text-gray-600 text-xs">+</span>
              <input
                value={fuel}
                onChange={e => setFuel(e.target.value)}
                className="w-16 px-2 py-1 bg-[#0A0A0A] border border-[#C9A84C]/50 rounded text-white text-xs text-right focus:outline-none"
                placeholder="fuel"
              />
            </>
          )}
          <button onClick={save} className="text-green-400 hover:text-green-300"><Check size={13} /></button>
          <button onClick={() => { setEditing(false); setPrice(String(row.price)) }} className="text-red-400 hover:text-red-300"><X size={13} /></button>
        </div>
      </td>
    )
  }

  return (
    <td className="px-3 py-2 text-right">
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5 ml-auto hover:text-[#C9A84C] transition-colors"
      >
        <span className="text-white font-semibold">{Number(row.price).toLocaleString('es-ES')}€</span>
        {row.fuel_extra && (
          <span className="text-gray-500 text-xs">+{row.fuel_extra}€ fuel</span>
        )}
        <Pencil size={11} className="text-gray-600 group-hover:text-[#C9A84C] opacity-0 group-hover:opacity-100 transition-all" />
      </button>
    </td>
  )
}

export default function PreciosPage() {
  const [boats, setBoats] = useState<any[]>([])
  const [pricing, setPricing] = useState<any[]>([])
  const [selectedBoat, setSelectedBoat] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()
    const [b, p] = await Promise.all([
      supabase.from('boats').select('id,name').in('name', ['Quicksilver 605', 'Cattleya X6', 'Joel', 'Sessa', 'Arendel']).order('name'),
      supabase.from('boat_pricing').select('*').order('season').order('tariff').order('duration'),
    ])
    setBoats(b.data ?? [])
    setPricing(p.data ?? [])
    if (b.data?.length) setSelectedBoat(b.data[0].id)
    setLoading(false)
  }

  async function handleSave(id: string, price: number, fuel_extra: number | null) {
    const supabase = createClient()
    await supabase.from('boat_pricing').update({ price, fuel_extra }).eq('id', id)
    setPricing(prev => prev.map(r => r.id === id ? { ...r, price, fuel_extra } : r))
  }

  const boatPricing = pricing.filter(r => r.boat_id === selectedBoat)
  const selectedBoatName = boats.find(b => b.id === selectedBoat)?.name ?? ''

  // Agrupar por tarifa + duración
  const grouped: Record<string, any[]> = {}
  for (const row of boatPricing) {
    const key = `${row.tariff}__${row.duration}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row)
  }

  // Ordenar temporadas en cada grupo
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => SEASON_ORDER.indexOf(a.season) - SEASON_ORDER.indexOf(b.season))
  }

  // Obtener temporadas únicas para este barco
  const seasons = [...new Set(boatPricing.map(r => r.season))].sort(
    (a, b) => SEASON_ORDER.indexOf(a) - SEASON_ORDER.indexOf(b)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="flex items-start gap-2 bg-[#C9A84C]/5 border border-[#C9A84C]/20 rounded-lg px-4 py-3">
        <Info size={15} className="text-[#C9A84C] flex-shrink-0 mt-0.5" />
        <p className="text-gray-400 text-xs">
          Haz clic en cualquier precio para editarlo. Los cambios se guardan en tiempo real.
          <strong className="text-white ml-1">Fianza sin patrón: 500€ · Descuento madrugadores: 10% OFF</strong>
        </p>
      </div>

      {/* Selector de barco */}
      <div className="flex gap-2 flex-wrap">
        {boats.map(b => (
          <button
            key={b.id}
            onClick={() => setSelectedBoat(b.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              selectedBoat === b.id
                ? 'bg-[#C9A84C] text-black border-[#C9A84C]'
                : 'bg-[#141414] text-gray-400 border-[#2A2A2A] hover:text-white hover:border-[#C9A84C]/30'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Tabla de precios */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2A2A]">
          <h3 className="text-white font-semibold">{selectedBoatName}</h3>
          <p className="text-gray-500 text-xs mt-0.5">Temporada 2026 · Salida: Club Náutico San Antonio</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] bg-[#111]">
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs w-40">Tarifa</th>
                <th className="text-left px-3 py-3 text-gray-500 font-medium text-xs w-24">Duración</th>
                {seasons.map(s => (
                  <th key={s} className="text-right px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">
                    {SEASON_LABELS[s] ?? s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {Object.entries(grouped).map(([key, rows]) => {
                const [tariff, duration] = key.split('__')
                const tc = TARIFF_LABELS[tariff]
                // Mapa temporada → row
                const bySeasonMap: Record<string, any> = {}
                for (const r of rows) bySeasonMap[r.season] = r

                return (
                  <tr key={key} className="hover:bg-[#1A1A1A] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${tc?.color ?? 'text-gray-400'}`}>
                        {tc?.label ?? tariff}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">
                      {DURATION_LABELS[duration] ?? duration}
                      {rows[0]?.hours && (
                        <span className="text-gray-600 ml-1">({rows[0].hours})</span>
                      )}
                    </td>
                    {seasons.map(s => {
                      const row = bySeasonMap[s]
                      if (!row) return <td key={s} className="px-3 py-3 text-gray-700 text-right text-xs">—</td>
                      return <PriceCell key={s} row={row} onSave={handleSave} />
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota pie */}
      <p className="text-gray-600 text-xs px-1">
        * Las rutas están sujetas a condiciones de viento. Horarios se ajustan según puesta de sol.
        Formentera y Es Vedrà solo disponibles con capitán del equipo Black Boats.
      </p>
    </div>
  )
}
