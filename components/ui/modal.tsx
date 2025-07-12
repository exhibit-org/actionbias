import React from 'react'
import { X } from 'react-feather'
import { componentClasses, cn } from '@/lib/utils/design-system'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, className, maxWidth = 'max-w-5xl' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className={componentClasses.modalOverlay}>
      <div className={cn(componentClasses.modalContainer, maxWidth, 'max-h-[80vh] text-foreground bg-background', className)}>
        <button
          onClick={onClose}
          className={componentClasses.modalCloseButton}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <h2 className={componentClasses.modalHeader}>
          {title}
        </h2>

        {children}
      </div>
    </div>
  )
}

interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn('flex flex-col flex-1 min-h-0', className)}>
      {children}
    </div>
  )
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('mt-6 flex items-center justify-between flex-shrink-0', className)}>
      {children}
    </div>
  )
}