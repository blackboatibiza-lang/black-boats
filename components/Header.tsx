'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/flota': 'Flota',
  '/reservas': 'Reservas',
  '/clientes': 'Clientes',
  '/tripulacion': 'Tripulación',
  '/extras': 'Extras & Servicios',
  '/pagos': 'Pagos',
  '/mantenimiento': 'Mantenimiento',
}

export default function Header() {
  const pathname = usePathname()
  const base = '/' + pathname.split('/')[1]
  const title = titles[base] || 'Black Boats'

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[#2A2A2A] bg-[#0A0A0A]">
      <h1 className="text-white font-semibold text-lg">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1E1E1E] text-gray-400 hover:text-white transition-colors">
          <Search size={18} />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1E1E1E] text-gray-400 hover:text-white transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C9A84C] rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#C9A84C] flex items-center justify-center text-black text-sm font-bold">
          BB
        </div>
      </div>
    </header>
  )
}
