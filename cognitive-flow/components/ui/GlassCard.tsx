import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export default function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={['glass-card rounded-2xl', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
