import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Activity, TrendingUp, Package,
  CreditCard, CalendarCheck, Settings, Zap, Radio, ShoppingCart, Phone, BarChart2
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { use3cStatus } from '../../hooks/use3c'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/atividades', label: 'Atividades', icon: Activity },
  { to: '/vendas', label: 'Vendas', icon: TrendingUp },
  { to: '/logistica', label: 'Logística', icon: Package },
  { to: '/cobranca', label: 'Cobrança', icon: CreditCard },
  { to: '/hoje', label: 'Hoje', icon: CalendarCheck },
  { to: '/skale', label: 'Skale', icon: ShoppingCart },
  { to: '/tresc', label: '3C Plus', icon: Phone },
  { to: '/datacrazy', label: 'DataCrazy', icon: BarChart2 },
]

function StatusDot({ ok, loading }) {
  if (loading) return (
    <span className="w-1.5 h-1.5 rounded-full bg-faint animate-pulse" />
  )
  return (
    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-warning'}`}
      style={ok ? { boxShadow: '0 0 6px rgba(34,197,94,0.7)' } : {}} />
  )
}

export function Sidebar() {
  const { data: connected, isLoading: checking } = use3cStatus()

  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-screen sticky top-0 z-10"
      style={{
        background: 'rgba(6,6,6,0.97)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.div
          className="flex items-center gap-2.5"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <motion.div
            className="w-8 h-8 rounded-lg flex items-center justify-center relative"
            style={{ background: 'white', boxShadow: '0 0 20px rgba(255,255,255,0.3)' }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 28px rgba(255,255,255,0.45)' }}
            transition={{ duration: 0.2 }}
          >
            <Zap size={14} className="text-black" fill="black" />
          </motion.div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">MEY</span>
            <p className="text-[10px] leading-none mt-0.5 tracking-widest uppercase" style={{ color: '#333' }}>gestão comercial</p>
          </div>
        </motion.div>
      </div>

      {/* Status strip */}
      <div className="px-5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot ok={connected} loading={checking} />
            <span className="text-[11px]" style={{ color: '#444' }}>
              {checking ? 'Conectando…' : connected ? 'Sistema online' : 'Modo offline'}
            </span>
          </div>
          {connected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1"
            >
              <Radio size={9} style={{ color: '#22c55e' }} />
              <span className="text-[9px] font-medium" style={{ color: '#22c55e' }}>3C</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i + 0.1, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative',
                isActive ? 'text-black font-semibold' : 'text-text-secondary hover:text-text'
              )}
              style={({ isActive }) => isActive ? {
                background: 'white',
                boxShadow: '0 0 20px rgba(255,255,255,0.18)',
              } : {}}
            >
              {({ isActive }) => (
                <>
                  {!isActive && (
                    <span
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    />
                  )}
                  <Icon size={14} className={isActive ? 'text-black' : 'text-faint group-hover:text-text-secondary'} />
                  <span className="tracking-[-0.01em]">{label}</span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom — Integrações */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.35 }}
        >
          <NavLink
            to="/integracoes"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
              isActive ? 'bg-white text-black font-semibold' : 'text-text-secondary hover:text-text hover:bg-white/[0.05]'
            )}
            style={({ isActive }) => isActive ? { boxShadow: '0 0 16px rgba(255,255,255,0.14)' } : {}}
          >
            <Settings size={14} />
            <span className="tracking-[-0.01em]">Integrações</span>
          </NavLink>
        </motion.div>

        {/* Version */}
        <div className="px-3 pt-2">
          <p className="text-[10px] tabular-nums" style={{ color: '#222' }}>v1.0 · mey.app</p>
        </div>
      </div>
    </aside>
  )
}
