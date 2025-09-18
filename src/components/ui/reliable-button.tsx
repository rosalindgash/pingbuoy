import React from 'react'

interface ReliableButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'outline-on-blue'
  size?: 'sm' | 'default' | 'lg'
  children: React.ReactNode
}

/**
 * A reliable button component that doesn't depend on complex CSS variables
 * This is a permanent solution to prevent white/invisible button issues
 */
export function ReliableButton({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}: ReliableButtonProps) {

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'outline':
        return 'border-2 border-gray-300 text-gray-900 bg-white hover:bg-gray-50 transition-colors duration-200'
      case 'outline-on-blue':
        return 'border-2 border-white text-white bg-transparent hover:bg-white hover:text-blue-600 transition-colors duration-200'
      case 'secondary':
        return 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
      case 'destructive':
        return 'bg-red-600 text-white hover:bg-red-700 border border-red-600'
      default: // 'default'
        return 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600'
    }
  }

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'lg':
        return 'px-8 py-3 text-lg'
      default: // 'default'
        return 'px-4 py-2 text-base'
    }
  }

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'

  const combinedClassName = `${baseStyles} ${getVariantStyles(variant)} ${getSizeStyles(size)} ${className}`

  return (
    <button
      className={combinedClassName}
      {...props}
    >
      {children}
    </button>
  )
}