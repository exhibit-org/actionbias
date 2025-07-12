import React from 'react'
import { componentClasses, cn } from '@/lib/utils/design-system'

interface CardProps {
  children: React.ReactNode
  className?: string
  selected?: boolean
  hoverable?: boolean
  onClick?: () => void
}

export function Card({ children, className, selected, hoverable, onClick }: CardProps) {
  return (
    <div
      className={cn(
        componentClasses.card,
        selected && componentClasses.cardSelected,
        hoverable && componentClasses.cardHover,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-border', className)}>
      {children}
    </div>
  )
}