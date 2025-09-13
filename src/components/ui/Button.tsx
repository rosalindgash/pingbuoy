import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'cta'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 focus-visible:ring-[#1E3A8A]': variant === 'primary',
            'bg-[#10B981] text-white hover:bg-[#10B981]/90 focus-visible:ring-[#10B981]': variant === 'secondary',
            'border border-[#1E3A8A] bg-white text-[#1E3A8A] hover:bg-[#F3F4F6] focus-visible:ring-[#1E3A8A]': variant === 'outline',
            'text-[#111827] hover:bg-[#F3F4F6] focus-visible:ring-[#1E3A8A]': variant === 'ghost',
            'bg-[#F97316] text-white hover:bg-[#F97316]/90 focus-visible:ring-[#F97316]': variant === 'cta',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'