import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'

const PAGE_VARIANTS = {
  initial: {
    opacity: 0,
    y: 16,
    filter: 'blur(6px)',
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(3px)',
    scale: 1.005,
  },
}

const PAGE_TRANSITION = {
  duration: 0.38,
  ease: [0.23, 1, 0.32, 1],
}

export function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Ambient orb top-left */}
      <motion.div
        className="pointer-events-none fixed top-[-120px] left-[-80px] w-[500px] h-[500px] rounded-full opacity-[0.04] z-0"
        style={{ background: 'radial-gradient(circle, white 0%, transparent 65%)' }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.04, 0.06, 0.04] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ambient orb bottom-right */}
      <motion.div
        className="pointer-events-none fixed bottom-[-100px] right-[-60px] w-[400px] h-[400px] rounded-full opacity-[0.025] z-0"
        style={{ background: 'radial-gradient(circle, white 0%, transparent 65%)' }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.025, 0.04, 0.025] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      <Sidebar />

      <main className="flex-1 overflow-y-auto relative z-[1]" style={{ scrollBehavior: 'smooth' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="page-wrapper"
            variants={PAGE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={PAGE_TRANSITION}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
