import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, CheckSquare, Square, Plus } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { TASKS, SELLERS, LEADS } from '../lib/mockData'

const TYPE_CONFIG = {
  call:    { label: 'Ligação',   icon: Phone },
  message: { label: 'WhatsApp',  icon: MessageSquare },
  check:   { label: 'Verificar', icon: CheckSquare },
}
const PRIORITY_CONFIG = {
  high:   { label: 'Alta',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  medium: { label: 'Média',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  low:    { label: 'Baixa',  color: '#555', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
}

function TaskRow({ task, onToggle, delay }) {
  const type = TYPE_CONFIG[task.type] || TYPE_CONFIG.check
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low
  const lead = LEADS.find(l => l.id === task.lead_id)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: task.done ? 0.45 : 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <button onClick={() => onToggle(task.id)} className="shrink-0 transition-colors">
        {task.done
          ? <CheckSquare size={16} className="text-success" />
          : <Square size={16} className="text-faint hover:text-text" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.done ? 'line-through text-faint' : 'text-white'}`}>{task.title}</p>
        {lead && <p className="text-xs text-faint mt-0.5">{lead.phone}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: pri.bg, border: `1px solid ${pri.border}`, color: pri.color }}>
          {pri.label}
        </span>
        <type.icon size={12} className="text-faint" />
      </div>
    </motion.div>
  )
}

export default function Hoje() {
  const [tasks, setTasks] = useState(TASKS)
  const [sellerFilter, setSellerFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', type: 'call', seller_key: '', priority: 'medium' })

  const byVendedor = useMemo(() => {
    const t = sellerFilter === 'all' ? tasks : tasks.filter(t => t.seller_key === sellerFilter)
    const groups = {}
    SELLERS.forEach(s => {
      const st = t.filter(x => x.seller_key === s.seller_key)
      if (st.length > 0) groups[s.seller_key] = { seller: s, tasks: st }
    })
    return groups
  }, [tasks, sellerFilter])

  const summary = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.done).length,
    pending: tasks.filter(t => !t.done).length,
    pct: tasks.length ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0,
  }), [tasks])

  const handleToggle = id => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const handleAdd = () => {
    if (!newTask.title || !newTask.seller_key) return
    setTasks(p => [...p, { id: `t${Date.now()}`, ...newTask, due_date: new Date().toISOString(), done: false }])
    setNewTask({ title: '', type: 'call', seller_key: '', priority: 'medium' })
    setShowModal(false)
  }

  return (
    <div className="p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hoje</h1>
          <p className="text-sm text-faint mt-0.5">Tarefas do dia</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Nova tarefa
        </Button>
      </motion.div>

      {/* Progress card */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl p-5 hover-glow"
        style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-faint uppercase tracking-wider mb-1">Progresso do dia</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              <AnimatedNumber value={summary.pct} suffix="%" />
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{summary.done}/{summary.total}</p>
            <p className="text-xs text-faint">{summary.pending} pendentes</p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${summary.pct}%` }}
            transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Seller filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Todos'], ...SELLERS.map(s => [s.seller_key, s.name.split(' ')[0]])].map(([val, lbl]) => (
          <button key={val} onClick={() => setSellerFilter(val)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={sellerFilter === val
              ? { background: 'white', color: 'black' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#666' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.values(byVendedor).map(({ seller, tasks: st }, ci) => {
          const done = st.filter(t => t.done).length
          const pct = st.length ? Math.round((done / st.length) * 100) : 0
          return (
            <motion.div key={seller.seller_key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.08 }}
              className="rounded-xl overflow-hidden hover-glow"
              style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Avatar name={seller.name} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{seller.name}</p>
                  <p className="text-xs text-faint">{done}/{st.length} concluídas</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.4 + ci * 0.1, duration: 0.7 }} />
                  </div>
                  <span className="text-xs font-medium text-text-secondary tabular-nums">{pct}%</span>
                </div>
              </div>

              {/* Tasks */}
              <div className="px-4">
                {st
                  .sort((a, b) => {
                    if (a.done !== b.done) return a.done ? 1 : -1
                    return { high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]
                  })
                  .map((task, i) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggle} delay={ci * 0.08 + i * 0.04} />
                  ))
                }
              </div>
            </motion.div>
          )
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova tarefa">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-faint mb-1">Descrição</p>
            <Input placeholder="O que precisa ser feito?" value={newTask.title}
              onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <p className="text-xs text-faint mb-1">Vendedor</p>
            <Select value={newTask.seller_key} onChange={e => setNewTask(p => ({ ...p, seller_key: e.target.value }))} className="w-full">
              <option value="">Selecionar...</option>
              {SELLERS.map(s => <option key={s.seller_key} value={s.seller_key}>{s.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-faint mb-1">Tipo</p>
              <Select value={newTask.type} onChange={e => setNewTask(p => ({ ...p, type: e.target.value }))} className="w-full">
                {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </div>
            <div>
              <p className="text-xs text-faint mb-1">Prioridade</p>
              <Select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} className="w-full">
                {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={!newTask.title || !newTask.seller_key}>
              <Plus size={14} /> Criar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
