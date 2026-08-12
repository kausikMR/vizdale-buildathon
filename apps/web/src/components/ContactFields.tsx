import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ContactValues {
  name: string
  mobile: string
  email: string
}

const FIELDS = [
  {
    key: 'name',
    label: 'Full name',
    type: 'text',
    autoComplete: 'name',
    placeholder: 'Ravi Menon',
    hint: undefined,
  },
  {
    key: 'mobile',
    label: 'Mobile number',
    type: 'tel',
    autoComplete: 'tel',
    placeholder: '9800000002',
    hint: 'Mobile or email — at least one is required.',
  },
  {
    key: 'email',
    label: 'Email address',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'ravi@example.org',
    hint: undefined,
  },
] as const

interface Props {
  values: ContactValues
  onChange: (values: ContactValues) => void
  /** Server-reported field name, so the message lands on the right input. */
  errorField?: string
  errorMessage?: string
  disabled?: boolean
}

export function ContactFields({ values, onChange, errorField, errorMessage, disabled }: Props) {
  return (
    <>
      {FIELDS.map((field) => {
        const invalid = errorField === field.key && errorMessage
        const errorId = `${field.key}-error`
        const hintId = `${field.key}-hint`

        return (
          <div key={field.key} className="grid gap-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.key !== 'name' && (
                <span className="font-normal text-muted-foreground"> (optional)</span>
              )}
            </Label>
            <Input
              id={field.key}
              name={field.key}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              disabled={disabled}
              value={values[field.key]}
              onChange={(e) => onChange({ ...values, [field.key]: e.target.value })}
              aria-invalid={invalid ? true : undefined}
              aria-describedby={invalid ? errorId : field.hint ? hintId : undefined}
            />
            {invalid ? (
              <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
                {errorMessage}
              </p>
            ) : (
              field.hint && (
                <p id={hintId} className="text-sm text-muted-foreground">
                  {field.hint}
                </p>
              )
            )}
          </div>
        )
      })}
    </>
  )
}
