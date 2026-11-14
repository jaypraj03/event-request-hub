import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { DEPARTMENT_BY_ID } from '../lib/departments'
import type { DepartmentId, RequestStatus } from '../lib/types'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-navy text-white hover:bg-navy-700 shadow-sm',
    secondary: 'bg-white text-ink border border-line hover:border-navy/40 shadow-sm',
    ghost: 'text-navy hover:bg-navy/5',
    danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      aria-hidden
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-line bg-white/90 shadow-[0_1px_2px_rgba(22,35,58,0.04)]', className)}>
      {children}
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-red-600">*</span>}
        {hint && <span className="ml-1 font-normal text-slate-500">— {hint}</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClass = (invalid?: boolean) =>
  cx(
    'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 transition',
    'focus:outline-none focus:ring-2 focus:ring-navy/25',
    invalid ? 'border-red-400 focus:border-red-500' : 'border-line focus:border-navy/50',
  )

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cx(inputClass(invalid), className)} {...props} />
}

export const STATUS_META: Record<RequestStatus, { label: string; className: string; dot: string }> = {
  new: { label: 'New', className: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  in_review: { label: 'In review', className: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', className: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-500' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', m.className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export function DepartmentBadge({ department }: { department: DepartmentId }) {
  const d = DEPARTMENT_BY_ID[department]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-medium text-navy">
      <span aria-hidden>{d.icon}</span>
      {d.name}
    </span>
  )
}

export function Logo({ org }: { org: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#1e3a5f" />
        <path d="M9 11h14M9 16h14M9 21h9" stroke="#e3a43a" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <div className="font-display text-lg font-semibold text-ink">{org}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Event Request Hub</div>
      </div>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  )
}
