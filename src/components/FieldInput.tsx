import type { FieldDef } from '../lib/departments'
import type { FieldValue } from '../lib/types'
import { cx, inputClass } from './ui'

interface Props {
  id: string
  field: FieldDef
  value: FieldValue
  invalid?: boolean
  onChange: (value: FieldValue) => void
}

/** Renders the right control for a department field definition. */
export function FieldInput({ id, field, value, invalid, onChange }: Props) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          id={id}
          rows={3}
          className={inputClass(invalid)}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'select':
      return (
        <select
          id={id}
          className={cx(inputClass(invalid), 'appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-9')}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath d='M5.5 7.5l4.5 4.5 4.5-4.5'/%3E%3C/svg%3E\")",
          }}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )

    case 'multiselect': {
      const selected = Array.isArray(value) ? value : []
      return (
        <div id={id} role="group" className="flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const on = selected.includes(o)
            return (
              <button
                type="button"
                key={o}
                aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-sm transition',
                  on
                    ? 'border-navy bg-navy text-white'
                    : cx('bg-white text-ink hover:border-navy/40', invalid ? 'border-red-300' : 'border-line'),
                )}
              >
                {on && <span aria-hidden>✓ </span>}
                {o}
              </button>
            )
          })}
        </div>
      )
    }

    case 'toggle': {
      const on = Boolean(value)
      return (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className="flex w-fit items-center gap-3 text-sm text-slate-600"
        >
          <span className={cx('relative h-6 w-11 rounded-full transition', on ? 'bg-navy' : 'bg-slate-300')}>
            <span
              className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')}
            />
          </span>
          {on ? 'Yes' : 'No'}
        </button>
      )
    }

    default:
      return (
        <input
          id={id}
          type={field.type}
          min={field.type === 'number' ? field.min : undefined}
          inputMode={field.type === 'number' ? 'numeric' : undefined}
          className={inputClass(invalid)}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}
