import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, CheckSquare, Square, Plus, CalendarCheck } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useTasks, useSellers } from '../lib/store'

const TYPE_CONFIG = {
  call:    { label: 'Ligação',   icon: Phone },
  message: { label: 'WhatsApp',  icon: MessageSquare },
  check:   { label: 'Verificar', icon: CheckSquare },
}
const PRIORITY_CONFIG = {
  high:   { label: 'Alta',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.2)'   },
  medium: { label: 'Média',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)'  },
  low:    { label: 'Baixa',  color: '#555',    bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
}

function TaskRow({ task, onToggle, onDelete, delay }) {
  const type = TYPE_CONFIG[task.type] || TYPE_CONFIG.check
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low
  const Icon = type.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: task.done ? 0.45 : 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <button onClick={() => onToggle(task.id)} className="shrink-0 transition-colors">
        {task.done
          ? <CheckSquare size={16} className="text-success" />
          : <Square size={16} className="text-faint hover:text-text" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.done ? 'line-through text-faint' : 'text-white'}`}>{task.title}</p>
        {task.phone && <p className="text-xs text-faint mt-0.5">{task.phone}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: pri.bg, border: `1px solid ${pri.border}`, color: pri.color }}>
          {pri.label}
        </span>
        <Icon size={12} className="text-faint" />
        <button onClick={() => onDelete(task.id)} className="text-faint hover:text-destructive transition-colors ml-1">
          <Square size={12} />
        </button>
      </div>
    </motion.div>
  )
}

function AddTaskModal({ open, onClose, onAdd, sellers }) {
  const [form, setForm] = useState({ title: '', type: 'call', priority: 'medium', phone: '', seller_key: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onAdd({ ...form, done: false })
    setForm({ title: '', type: 'call', priority: 'medium', phone: '', seller_key: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova tarefa" className="max-w-sm mx-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Título</p>
          <Input placeholder="Ligar para cliente X" required value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Telefone</p>
          <Input placeholder="(11) 99999-9999" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Tipo</p>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full h-9 px-3 text-sm rounded text-text"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Prioridade</p>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full h-9 px-3 text-sm rounded text-text"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        {sellers.length > 0 && (
          <div>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Vendedor</p>
            <select value={form.seller_key} onChange={e => set('seller_key', e.target.value)}
              className="w-full h-9 px-3 text-sm rounded text-text"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">Todos</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <button type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-medium mt-2"
          style={{ background: 'white', color: 'black' }}>
          Criar tarefa
        </button>
      </form>
    </Modal>
  )
}

export default function Hoje() {
  const { items: tasks, add, update, remove } = useTasks()
  const { items: sellers } = useSellers()
  const [addOpen, setAddOpen] = useState(false)
  const [sellerFilter, setSellerFilter] = useState('all')

  const filtered = useMemo(() => {
    if (sellerFilter === 'all') return tasks
    return tasks.filter(t => t.seller_key === sellerFilter)
  }, [tasks, sellerFilter])

  const done = filtered.filter(t => t.done).length
  const pending = filtered.filter(t => !t.done).length

  const byPriority = useMemo(() => ({
    high: filtered.filter(t => !t.done && t.priority === 'high'),
    medium: filtered.filter(t => !t.done && t.priority === 'medium'),
    low: filtered.filter(t => !t.done && t.priority === 'low'),
    done: filtered.filter(t => t.done),
  }), [filtered])

  const handleToggle = (id) => {
    const task = tasks.find(t => t.id === id)
    if (task) update(id, { done: !task.done })
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Hoje</h1>
          <p className="text-xs text-faint mt-0.5">{pending} tarefas pendentes · {done} concluídas</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'white', color: 'black' }}>
          <Plus size={14} />
          Nova tarefa
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendentes', value: pending, color: '#f0f0f0' },
          { label: 'Concluídas', value: done, color: '#22c55e' },
          { label: 'Total', value: filtered.length, color: '#555' },
        ].map(({ label, value, color }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl p-4 hover-glow"
            style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-2">{label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              <AnimatedNumber value={value} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      {sellers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSellerFilter('all')}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={sellerFilter === 'all'
              ? { background: 'white', color: 'black' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
            Todos
          </button>
          {sellers.map(s => (
            <button key={s.id} onClick={() => setSellerFilter(s.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={sellerFilter === s.id
                ? { background: 'white', color: 'black' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Empty */}
      {tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CalendarCheck size={20} className="text-faint" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white mb-1">Nenhuma tarefa para hoje</p>
            <p className="text-xs text-faint">Crie tarefas de acompanhamento para sua equipe.</p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'white', color: 'black' }}>
            <Plus size={13} />
            Criar tarefa
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {[
            { key: 'high', label: 'Prioridade Alta', color: '#ef4444' },
            { key: 'medium', label: 'Prioridade Média', color: '#f59e0b' },
            { key: 'low', label: 'Prioridade Baixa', color: '#555' },
            { key: 'done', label: 'Concluídas', color: '#333' },
          ].filter(({ key }) => byPriority[key].length > 0).map(({ key, label, color }) => (
            <motion.div key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ease: [0.23, 1, 0.32, 1] }}
              className="rounded-xl px-5 py-4 hover-glow"
              style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p className="text-[10px] uppercase tracking-wider" style={{ color }}>{label}</p>
                <span className="text-[10px] text-faint">({byPriority[key].length})</span>
              </div>
              <AnimatePresence mode="sync">
                {byPriority[key].map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={remove}
                    delay={i * 0.04}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={add} sellers={sellers} />
    </div>
  )
}
