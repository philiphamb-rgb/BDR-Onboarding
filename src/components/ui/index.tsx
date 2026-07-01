'use client'

// BDR OS v2 — Core UI Components
// All components match the DESIGN_SYSTEM.md spec exactly.
// No stock libraries. No default Tailwind aesthetic. Intentional and custom.

import React, { forwardRef, useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { CloseIcon, CheckIcon, AlertIcon, InfoIcon, SuccessIcon } from '@/components/icons'

// ── cn() utility ──────────────────────────────────────────────────────────────
export function cn(...args: (string | undefined | null | boolean)[]) {
  return clsx(args)
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'conversion'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:     'bg-gradient-primary text-white shadow-button hover:opacity-90 hover:-translate-y-px',
  secondary:   'bg-navy text-white hover:bg-navy-dark hover:-translate-y-px',
  ghost:       'bg-transparent border-2 border-navy text-navy hover:bg-navy/5',
  destructive: 'bg-transparent border-2 border-error text-error hover:bg-error/5',
  // Highest-attention conversion action (teal). Reserve for the single most
  // important next step on a screen (Continue Learning / Mark Complete).
  conversion:  'bg-teal text-white shadow-button hover:bg-teal-dark hover:-translate-y-px',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-[38px] px-4 text-[13px] font-[700]',
  md: 'h-[50px] px-6 text-[14px] font-[800]',
  lg: 'h-[56px] px-8 text-[16px] font-[800]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill',
        'transition-all duration-[150ms] active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
        buttonVariants[variant],
        buttonSizes[size],
        isDisabled && 'opacity-50 cursor-not-allowed !translate-y-0 !shadow-none',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
        </svg>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  )
})
Button.displayName = 'Button'

// ═══════════════════════════════════════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════════════════════════════════════

type CardVariant = 'default' | 'active' | 'completed' | 'warning' | 'hero'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const cardVariants: Record<CardVariant, string> = {
  default:   'bg-card border border-border shadow-card',
  active:    'bg-[rgba(0,194,178,0.03)] border border-teal shadow-card',
  completed: 'bg-[rgba(22,163,74,0.03)] border border-success shadow-card',
  warning:   'bg-[rgba(245,166,35,0.07)] border border-gold shadow-card',
  hero:      'bg-gradient-hero text-white shadow-modal',
}

const cardPadding = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        cardVariants[variant],
        cardPadding[padding],
        hover && 'cursor-pointer transition-all duration-[150ms] hover:-translate-y-0.5 hover:shadow-modal',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Card subcomponents
export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-[18px] font-[700] text-dark-text leading-tight', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardLabel({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('label', className)} {...props}>
      {children}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOGGLE — the one switch used everywhere (settings prefs, roles matrix, …)
// ═══════════════════════════════════════════════════════════════════════════════

// A clean, proportional pill toggle. NOTE: it pins its own height inline because
// globals.css sets `button { min-height: 44px }` (an unlayered rule that beats
// Tailwind height utilities) — without the pin the track stretches into a circle.
const TOGGLE_SIZES = {
  sm: { track: 'h-5 w-9',  knob: 'h-4 w-4', on: 'translate-x-[18px]', off: 'translate-x-0.5', h: 20 },
  md: { track: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-[22px]', off: 'translate-x-0.5', h: 24 },
} as const

export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  className?: string
}) {
  const s = TOGGLE_SIZES[size]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked) }}
      style={{ minHeight: s.h }}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/40',
        s.track,
        checked ? 'bg-teal' : 'bg-gray-300',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <span className={cn('inline-block transform rounded-full bg-card shadow-sm transition-transform duration-200', s.knob, checked ? s.on : s.off)} />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface ModalProps {
  open?: boolean
  isOpen?: boolean  // alias
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'fullscreen'
  closeOnOverlay?: boolean
}

const modalSizes = {
  sm:         'max-w-[400px]',
  md:         'max-w-[560px]',
  lg:         'max-w-[720px]',
  fullscreen: 'max-w-none h-full rounded-none',
}

export function Modal({
  open: _open,
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlay = true,
}: ModalProps) {
  const open = _open || isOpen || false
  const panelRef = useRef<HTMLDivElement>(null)

  // Move focus into the dialog on open and restore it to the trigger on close,
  // so keyboard/screen-reader users don't get stranded behind the overlay.
  useEffect(() => {
    if (!open) return
    const prev = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
    const t = setTimeout(() => panelRef.current?.focus(), 0)
    return () => { clearTimeout(t); prev?.focus?.() }
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Keyboard: Escape closes
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-dark-text/40 backdrop-blur-[2px] animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'outline-none',
          'relative z-10 w-full bg-card',
          'rounded-t-xl sm:rounded-xl',
          'shadow-modal',
          'animate-slide-up sm:animate-fade-up',
          'max-h-[90vh] overflow-y-auto',
          modalSizes[size]
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
            <div>
              {title && (
                <h2 id="modal-title" className="text-[22px] font-[800] text-dark-text">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-[14px] text-gray">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex items-center justify-center w-[44px] h-[44px] rounded-full
                         text-gray hover:text-dark-text hover:bg-bdrbg
                         transition-colors duration-[150ms]"
              aria-label="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET (bottom drawer, mobile-first)
// ═══════════════════════════════════════════════════════════════════════════════

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  height?: 'auto' | 'half' | 'full'
}

export function Sheet({ open, onClose, title, children, height = 'auto' }: SheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const heightClass = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[92vh]',
  }[height]

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-end">
      <div
        className="absolute inset-0 bg-dark-text/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full bg-card',
          'rounded-t-xl overflow-hidden',
          'shadow-modal animate-slide-up',
          heightClass,
          'flex flex-col'
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-8 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
            <h2 className="text-[18px] font-[700] text-dark-text">{title}</h2>
            <button
              onClick={onClose}
              className="w-[44px] h-[44px] flex items-center justify-center rounded-full
                         text-gray hover:text-dark-text hover:bg-bdrbg
                         transition-colors duration-[150ms]"
              aria-label="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-safe">{children}</div>
      </div>
    </div>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════════

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'xp'

interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  message?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

// Toast store (simple, no external state library needed)
type ToastListener = (toasts: ToastItem[]) => void
const toastListeners: Set<ToastListener> = new Set()
let toasts: ToastItem[] = []

function notifyListeners() {
  toastListeners.forEach(fn => fn([...toasts]))
}

export const toast = {
  show(item: Omit<ToastItem, 'id'>) {
    const id = Math.random().toString(36).slice(2)
    toasts = [...toasts, { ...item, id }]
    notifyListeners()
    return id
  },
  success(title: string, message?: string) {
    return toast.show({ variant: 'success', title, message, duration: 4000 })
  },
  error(title: string, message?: string) {
    return toast.show({ variant: 'error', title, message, duration: 6000 })
  },
  warning(title: string, message?: string) {
    return toast.show({ variant: 'warning', title, message, duration: 5000 })
  },
  info(title: string, message?: string) {
    return toast.show({ variant: 'info', title, message, duration: 4000 })
  },
  xp(amount: number, action?: string) {
    return toast.show({
      variant: 'xp',
      title: `+${amount} XP`,
      message: action,
      duration: 3000,
    })
  },
  dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id)
    notifyListeners()
  },
}

const toastIcons: Record<ToastVariant, React.ReactNode> = {
  success: <SuccessIcon size={18} className="text-success" />,
  error:   <AlertIcon  size={18} className="text-error" />,
  warning: <AlertIcon  size={18} className="text-gold" />,
  info:    <InfoIcon   size={18} className="text-navy" />,
  xp:      <div className="text-teal font-[900] text-[14px]">XP</div>,
}

const toastBorders: Record<ToastVariant, string> = {
  success: 'border-l-success',
  error:   'border-l-error',
  warning: 'border-l-gold',
  info:    'border-l-navy',
  xp:      'border-l-teal',
}

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const duration = item.duration ?? 4000
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [item.duration, onDismiss])

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-[380px]',
        'bg-card rounded-lg shadow-modal',
        'border border-border border-l-4',
        toastBorders[item.variant],
        'p-4 animate-toast-in'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="shrink-0 mt-0.5">{toastIcons[item.variant]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-[700] text-dark-text">{item.title}</p>
        {item.message && (
          <p className="mt-0.5 text-[12px] text-gray">{item.message}</p>
        )}
        {item.action && (
          <button
            onClick={() => { item.action?.onClick(); onDismiss() }}
            className="mt-2 text-[12px] font-[700] text-teal hover:text-teal-dark"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 w-6 h-6 flex items-center justify-center text-gray
                   hover:text-dark-text transition-colors"
        aria-label="Dismiss"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener: ToastListener = (newToasts) => setItems(newToasts)
    toastListeners.add(listener)
    return () => { toastListeners.delete(listener) }
  }, [])

  if (items.length === 0) return null

  return createPortal(
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-full px-4"
      aria-label="Notifications"
    >
      {items.map(item => (
        <div key={item.id} className="flex justify-center">
          <ToastItem
            item={item}
            onDismiss={() => toast.dismiss(item.id)}
          />
        </div>
      ))}
    </div>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: boolean
}

export function Skeleton({ width, height = 16, className, rounded = false }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', rounded && 'rounded-full', className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} rounded />
        <div className="flex-1 space-y-2">
          <Skeleton height={14} className="w-1/2" />
          <Skeleton height={12} className="w-1/3" />
        </div>
      </div>
      <Skeleton height={12} className="w-full" />
      <Skeleton height={12} className="w-4/5" />
      <Skeleton height={12} className="w-3/5" />
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressBarProps {
  value: number            // 0–100
  max?: number
  color?: string
  height?: number
  animated?: boolean
  label?: string
  showValue?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  color,
  height = 6,
  animated = false,
  label,
  showValue = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  // Fill from 0 to the target on mount (and when the value changes) so progress
  // visibly "draws in". Reduced-motion users effectively see the final width.
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(pct), 80); return () => clearTimeout(t) }, [pct])

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="label">{label}</span>}
          {showValue && <span className="label">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className="w-full rounded-full bg-border overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            animated && 'animate-pulse-teal',
            !color && 'bg-gradient-primary'
          )}
          style={{
            width: `${w}%`,
            ...(color ? { backgroundColor: color } : {}),
          }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════════════════════

type BadgeVariant = 'teal' | 'navy' | 'gold' | 'success' | 'error' | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  color?: string  // alias for variant
  children: React.ReactNode
  className?: string
}

const badgeVariants: Record<BadgeVariant, string> = {
  teal:    'bg-teal/10 text-teal-dark',
  navy:    'bg-navy/10 text-navy',
  gold:    'bg-gold/10 text-[#A06C00]',
  success: 'bg-success/10 text-success',
  error:   'bg-error/10 text-error',
  gray:    'bg-border text-gray',
}

export function Badge({ variant, color, children, className }: BadgeProps) {
  const v = (variant ?? (color as BadgeVariant) ?? 'teal')
  // Fall back to a safe variant if an unknown one is passed (prevents silent
  // "no styling" / wrong-color regressions).
  const variantClass = badgeVariants[v] ?? badgeVariants.gray
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full',
        'text-[11px] font-[700] uppercase tracking-[0.07em]',
        variantClass,
        className
      )}
    >
      {children}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mb-4 text-teal animate-attention">
          {icon}
        </div>
      )}
      <h3 className="text-[18px] font-[700] text-dark-text mb-2">{title}</h3>
      {description && (
        <p className="text-[14px] text-gray max-w-[280px] leading-relaxed">{description}</p>
      )}
      {action && (
        <Button
          variant="primary"
          size="md"
          className="mt-6 animate-glow"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRMATION DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm" closeOnOverlay={!loading}>
      <div className="space-y-4">
        <div>
          <h2 className="text-[22px] font-[800] text-dark-text">{title}</h2>
          <p className="mt-2 text-[14px] text-gray">{description}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            fullWidth
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) {
    return <hr className={cn('border-border', className)} />
  }
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <hr className="flex-1 border-border" />
      <span className="label shrink-0">{label}</span>
      <hr className="flex-1 border-border" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════════════════════════════════════════════

interface AvatarProps {
  src?: string | null
  name: string
  size?: number
  className?: string
}

export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-hero flex items-center justify-center',
        'text-white font-[800] select-none shrink-0',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.35),
      }}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
