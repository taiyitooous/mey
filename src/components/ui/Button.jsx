import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-white text-black hover:bg-gray-200',
  ghost: 'bg-transparent text-text-secondary hover:bg-muted hover:text-text',
  outline: 'border border-border text-text hover:bg-muted',
  destructive: 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20',
  success: 'bg-success/10 text-success border border-success/20 hover:bg-success/20',
}

const sizes = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-8 w-8 p-0',
}

export function Button({ children, variant = 'default', size = 'md', className, disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus:outline-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  )
}
