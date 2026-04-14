import { cn } from '../../lib/utils'

export function Avatar({ name, size = 'md', className }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg',
  }

  return (
    <div className={cn(
      'rounded-full bg-muted border border-border flex items-center justify-center font-semibold text-text-secondary shrink-0',
      sizes[size],
      className
    )}>
      {initials}
    </div>
  )
}
