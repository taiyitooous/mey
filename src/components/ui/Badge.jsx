import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-muted text-text-secondary border border-border',
  white: 'bg-white text-black',
  outline: 'border border-border text-text-secondary',
  success: 'bg-success/10 text-success border border-success/20',
  destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
}

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
