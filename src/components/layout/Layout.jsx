import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'

export function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Ambient glow top-left */}
      <div
        className="pointer-events-none fixed top-0 left-0 w-96 h-96 opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', zIndex: 0 }}
      />

      <Sidebar />

      <main className="flex-1 overflow-y-auto relative z-[1]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
