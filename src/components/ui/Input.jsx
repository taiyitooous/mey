import { cn } from '../../lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-9 px-3 text-sm bg-surface border border-border rounded text-text',
        'placeholder:text-faint focus:outline-none focus:border-subtle transition-colors',
        className
      )}
      {...props}
    />
  )
}

export function Select({ children, className, ...props }) {
  return (
    <select
      className={cn(
        'h-9 px-3 text-sm bg-surface border border-border rounded text-text',
        'focus:outline-none focus:border-subtle transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 text-sm bg-surface border border-border rounded text-text',
        'placeholder:text-faint focus:outline-none focus:border-subtle transition-colors resize-none',
        className
      )}
      {...props}
    />
  )
}
