import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Activity, TrendingUp, Package,
  CreditCard, CalendarCheck, Settings, Zap
} from 'lucide-react'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/atividades', label: 'Atividades', icon: Activity },
  { to: '/vendas', label: 'Vendas', icon: TrendingUp },
  { to: '/logistica', label: 'Logística', icon: Package },
  { to: '/cobranca', label: 'Cobrança', icon: CreditCard },
  { to: '/hoje', label: 'Hoje', icon: CalendarCheck },
]

export function Sidebar() {
  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-screen sticky top-0 z-10"
      style={{
        background: 'rgba(8,8,8,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.div
          className="flex items-center gap-2.5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center relative"
            style={{
              background: 'white',
              boxShadow: '0 0 20px rgba(255,255,255,0.25)',
            }}
          >
            <Zap size={15} className="text-black" fill="black" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">MEY</span>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#444' }}>gestão comercial</p>
          </div>
        </motion.div>
      </div>

      {/* Live indicator */}
      <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-3 h-3">
            <span className="absolute w-3 h-3 rounded-full bg-success/30 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
          </div>
          <span className="text-xs" style={{ color: '#555' }}>Sistema online</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
          >
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative',
                isActive
                  ? 'text-black font-semibold'
                  : 'text-text-secondary hover:text-text'
              )}
              style={({ isActive }) => isActive ? {
                background: 'white',
                boxShadow: '0 0 16px rgba(255,255,255,0.15)',
              } : {}}
            >
              {({ isActive }) => (
                <>
                  {!isActive && (
                    <span
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  )}
                  <Icon size={15} className={isActive ? 'text-black' : 'text-faint group-hover:text-text-secondary'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <NavLink
          to="/integracoes"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
            isActive ? 'bg-white text-black font-semibold' : 'text-text-secondary hover:text-text hover:bg-white/[0.04]'
          )}
          style={({ isActive }) => isActive ? { boxShadow: '0 0 16px rgba(255,255,255,0.12)' } : {}}
        >
          <Settings size={15} />
          Integrações
        </NavLink>
      </div>
    </aside>
  )
}
