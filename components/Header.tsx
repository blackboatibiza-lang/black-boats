'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'

const titles: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/flota':       'Flota',
  '/reservas':    'Reservas',
  '/clientes':    'Clientes',
  '/extras':      'Extras & Servicios',
  '/gastos':      'Gastos',
  '/facturacion': 'Facturación',
  '/informes':    'Informes',
  '/ajustes':     'Ajustes',
}

export default function Header({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const pathname = usePathname()
  const base  = '/' + pathname.split('/')[1]
  const title = titles[base] || 'Black Boats'

  return (
    <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
          <Menu size={20} />
        </button>
        <h1 className="text-gray-900 font-semibold text-base lg:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
          <Search size={18} />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors relative">
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
