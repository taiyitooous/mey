import { cn } from '../../lib/utils'

export function Card({ children, className, onClick }) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg',
        onClick && 'cursor-pointer hover:border-subtle transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-4 py-3 border-b border-border', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className }) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-sm font-semibold text-text uppercase tracking-wider', className)}>
      {children}
    </h3>
  )
}
