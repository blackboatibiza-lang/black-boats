'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Anchor, CalendarDays, Users, Package,
  CreditCard, Settings, ChevronRight, LogOut, Receipt, BarChart2, X, Clock,
} from 'lucide-react'
import { getSession, clearSession } from '@/lib/session'
import { useEffect, useState } from 'react'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, key: 'dashboard'   },
  { href: '/flota',       label: 'Flota',       icon: Anchor,          key: 'flota'       },
  { href: '/reservas',    label: 'Reservas',    icon: CalendarDays,    key: 'reservas'    },
  { href: '/clientes',    label: 'Clientes',    icon: Users,           key: 'clientes'    },
  { href: '/extras',      label: 'Extras',      icon: Package,         key: 'extras'      },
  { href: '/gastos',      label: 'Gastos',      icon: Receipt,         key: 'gastos'      },
  { href: '/facturacion', label: 'Facturación', icon: CreditCard,      key: 'facturacion' },
  { href: '/informes',    label: 'Informes',    icon: BarChart2,       key: 'informes'    },
  { href: '/fichajes',    label: 'Fichajes',    icon: Clock,           key: 'fichajes'    },
]

const navBottom = [
  { href: '/ajustes', label: 'Ajustes', icon: Settings, key: 'ajustes' },
]

const ROLE_DEFAULTS: Record<string, string[]> = {
  admin:    ['dashboard','flota','reservas','clientes','extras','gastos','facturacion','informes','fichajes','ajustes'],
  socio:    ['dashboard','reservas','facturacion','informes'],
  empleado: ['dashboard','flota','reservas','clientes','extras','gastos','fichajes'],
}

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]               = useState<{ name: string; role: string } | null>(null)
  const [allowedKeys, setAllowedKeys] = useState<string[]>([])

  useEffect(() => {
    const s = getSession()
    if (!s) return
    setUser({ name: s.name, role: s.role })
    const perms = s.permissions?.length > 0
      ? s.permissions
      : (ROLE_DEFAULTS[s.role] ?? ROLE_DEFAULTS.admin)
    setAllowedKeys(perms)
  }, [])

  // Close on navigation
  useEffect(() => { onClose() }, [pathname])

  function logout() {
    clearSession()
    router.push('/login')
  }

  const content = (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-[#0A0A0A] h-full border-r border-[#2A2A2A]">
      <div className="px-4 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
        <img src="/logo.jpg" alt="Black Boats Ibiza" className="h-20 w-auto object-contain" />
        <button onClick={onClose} className="lg:hidden text-gray-600 hover:text-white p-1 transition-colors">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.filter(item => allowedKeys.length === 0 || allowedKeys.includes(item.key)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
                ${active ? 'bg-[#C9A84C]/10 text-[#C9A84C] font-medium' : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'}`}>
              <div className="flex items-center gap-3">
                <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                <span>{label}</span>
              </div>
              {active && <ChevronRight size={14} className="text-[#C9A84C]" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-3 border-t border-[#2A2A2A] pt-2">
        {navBottom.filter(item => allowedKeys.length === 0 || allowedKeys.includes(item.key)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
                ${active ? 'bg-[#C9A84C]/10 text-[#C9A84C] font-medium' : 'text-gray-400 hover:text-white hover:bg-[#1E1E1E]'}`}>
              <div className="flex items-center gap-3">
                <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                <span>{label}</span>
              </div>
              {active && <ChevronRight size={14} className="text-[#C9A84C]" />}
            </Link>
          )
        })}
        {user && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2.5 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <div className="w-7 h-7 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] text-xs font-bold flex-shrink-0">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <p className="text-gray-600 text-[10px] capitalize">{user.role}</p>
            </div>
            <button onClick={logout} title="Cerrar sesión"
              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        )}
        <p className="text-gray-600 text-xs text-center mt-2">Black Boats © 2025</p>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex h-screen">{content}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  )
}
