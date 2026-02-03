import * as React from 'react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  side?: 'left' | 'right'
}

export function Sheet({ open, onOpenChange, children, side = 'right' }: SheetProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80" onClick={() => onOpenChange(false)} />
      )}
      <div
        className={cn(
          'fixed z-50 h-full w-64 border-r bg-background p-6 shadow-lg transition-transform duration-200',
          side === 'left' ? 'left-0' : 'right-0',
          open ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'
        )}
      >
        {children}
      </div>
    </>
  )
}

export function SheetContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('h-full', className)}>{children}</div>
}

export function SheetHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}>{children}</div>
}

export function SheetTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2 className={cn('text-lg font-semibold text-foreground', className)}>{children}</h2>
  )
}

export function SheetDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
}
