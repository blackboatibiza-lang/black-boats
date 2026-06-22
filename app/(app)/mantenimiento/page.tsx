'use client'

import { useState, useEffect } from 'react'
import { Plus, Wrench, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function MantenimientoPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('maintenance')
      .select('*, boat:boats(name)')
      .order('scheduled_date', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }

  async function markComplete(id: string) {
    const supabase = createClient()
    await supabase.from('maintenance').update({
      is_completed: true,
      completed_date: new Date().toISOString().split('T')[0],
    }).eq('id', id)
    load()
  }

  const pending = tasks.filter(t => !t.is_completed)
  const completed = tasks.filter(t => t.is_completed)
  const overdue = pending.filter(t => t.scheduled_date && new Date(t.scheduled_date) < new Date())

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
        {[
          { label: 'Pendientes', value: pending.length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Vencidas', value: overdue.length, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Completadas', value: completed.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
        ].map(s => (
          <div key={s.label} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={17} className={s.color} />
            </div>
            <div>
              <p className="text-white text-xl font-bold">{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#E8C97A] text-black text-sm font-semibold rounded-lg transition-colors">
          <Plus size={16} /> Nueva tarea
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <Wrench size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">No hay tareas de mantenimiento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const isOverdue = !task.is_completed && task.scheduled_date && new Date(task.scheduled_date) < new Date()
            return (
              <div
                key={task.id}
                className={`bg-[#141414] border rounded-xl p-5 flex items-start gap-4 ${isOverdue ? 'border-red-400/30' : 'border-[#2A2A2A]'}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${task.is_completed ? 'bg-green-400/10' : isOverdue ? 'bg-red-400/10' : 'bg-yellow-400/10'}`}>
                  {task.is_completed
                    ? <CheckCircle size={17} className="text-green-400" />
                    : isOverdue
                      ? <AlertCircle size={17} className="text-red-400" />
                      : <Wrench size={17} className="text-yellow-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-semibold">{task.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {task.boat?.name ?? '—'}{task.description ? ` · ${task.description}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {task.scheduled_date && (
                        <p className="text-gray-400 text-xs">
                          {new Date(task.scheduled_date).toLocaleDateString('es-ES')}
                        </p>
                      )}
                      {task.cost > 0 && (
                        <p className="text-[#C9A84C] text-sm font-semibold mt-0.5">{Number(task.cost).toLocaleString()}€</p>
                      )}
                    </div>
                  </div>
                  {isOverdue && <p className="text-red-400 text-xs mt-1.5">⚠ Tarea vencida</p>}
                  {task.is_completed && task.completed_date && (
                    <p className="text-green-400 text-xs mt-1.5">
                      Completada el {new Date(task.completed_date).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
                {!task.is_completed && (
                  <button
                    onClick={() => markComplete(task.id)}
                    className="text-xs px-3 py-1.5 border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#C9A84C]/40 rounded-lg transition-colors flex-shrink-0"
                  >
                    Completar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
