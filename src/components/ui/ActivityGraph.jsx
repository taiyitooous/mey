import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { subDays, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const WEEKS = 16
const DAYS_ORDER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getOpacity(count, max) {
  if (!count || count === 0) return 0.04
  const ratio = count / max
  if (ratio < 0.15) return 0.12
  if (ratio < 0.35) return 0.28
  if (ratio < 0.60) return 0.50
  if (ratio < 0.80) return 0.72
  return 0.92
}

export function ActivityGraph({ data = [] }) {
  const [tooltip, setTooltip] = useState(null)

  const { grid, max, monthLabels } = useMemo(() => {
    const today = new Date()
    const totalDays = WEEKS * 7
    const grid = []
    const months = []
    let lastMonth = null

    for (let w = WEEKS - 1; w >= 0; w--) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const daysAgo = w * 7 + (6 - d)
        const date = subDays(today, daysAgo)
        const dateStr = format(date, 'yyyy-MM-dd')
        const entry = data.find(x => x.date === dateStr)
        const count = entry?.count || 0
        const monthKey = format(date, 'M')

        if (d === 0 && monthKey !== lastMonth) {
          months.push({ weekIdx: WEEKS - 1 - w, label: format(date, 'MMM', { locale: ptBR }) })
          lastMonth = monthKey
        }

        week.push({ date, dateStr, count, dow: d })
      }
      grid.push(week)
    }

    const max = Math.max(...grid.flat().map(c => c.count), 1)
    return { grid, max, monthLabels: months }
  }, [data])

  return (
    <div className="relative select-none">
      {/* Month labels */}
      <div className="flex mb-1 ml-7" style={{ gap: '3px' }}>
        {(() => {
          const labels = []
          for (let w = 0; w < WEEKS; w++) {
            const m = monthLabels.find(ml => ml.weekIdx === w)
            labels.push(
              <div key={w} className="text-[9px] text-faint capitalize" style={{ width: 12, flexShrink: 0 }}>
                {m ? m.label : ''}
              </div>
            )
          }
          return labels
        })()}
      </div>

      <div className="flex" style={{ gap: '3px' }}>
        {/* Day labels */}
        <div className="flex flex-col mr-1" style={{ gap: '3px' }}>
          {DAYS_ORDER.map((d, i) => (
            <div key={d} className="text-[9px] text-faint flex items-center justify-end" style={{ width: 22, height: 12 }}>
              {i % 2 !== 0 ? d.slice(0, 1) : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col" style={{ gap: '3px' }}>
            {week.map((cell, di) => {
              const opacity = getOpacity(cell.count, max)
              return (
                <motion.div
                  key={cell.dateStr}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: wi * 0.012 + di * 0.006, duration: 0.3, ease: 'easeOut' }}
                  onMouseEnter={(e) => setTooltip({ cell, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: `rgba(255,255,255,${opacity})`,
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'default',
                    flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                  whileHover={{ scale: 1.3 }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-faint">Menos</span>
        {[0.04, 0.15, 0.35, 0.60, 0.90].map((op, i) => (
          <div
            key={i}
            style={{
              width: 12, height: 12, borderRadius: 3,
              background: `rgba(255,255,255,${op})`,
              border: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          />
        ))}
        <span className="text-[10px] text-faint">Mais</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 36,
            background: 'rgba(20,20,20,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            color: '#f0f0f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#888' }}>{format(tooltip.cell.date, "dd 'de' MMM", { locale: ptBR })}: </span>
          <span className="font-semibold">{tooltip.cell.count} ligações</span>
        </div>
      )}
    </div>
  )
}
