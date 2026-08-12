/**
 * Labelled text input. ui.tsx has no input primitive, and this lives here
 * rather than in ui.tsx so other lanes editing that shared file do not collide
 * with the auth module.
 *
 * Every input gets a real <label> — a placeholder is not a label (DESIGN.md
 * section 8) — and errors render inline beside the field they belong to.
 */
interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  placeholder?: string
  hint?: string
  error?: string | null
  disabled?: boolean
  optional?: boolean
}

export function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  hint,
  error,
  disabled,
  optional,
}: FieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
          disabled:cursor-not-allowed disabled:opacity-50"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
