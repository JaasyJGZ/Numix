import React from "react"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface AccessibleFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  ariaLabel?: string
  ariaDescribedby?: string
  noValidate?: boolean
}

export const AccessibleForm = forwardRef<HTMLFormElement, AccessibleFormProps>(
  ({ className, ariaLabel, ariaDescribedby, noValidate = true, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={cn("space-y-4", className)}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        noValidate={noValidate}
        {...props}
      />
    )
  },
)

AccessibleForm.displayName = "AccessibleForm"

interface FormFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function AccessibleFormField({ id, label, error, hint, required, children, className }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const ariaDescribedby = [hintId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-200">
        {label}
        {required && (
          <span className="text-[#FF6B6B] ml-1" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (requerido)</span>}
      </label>

      {hint && (
        <div id={hintId} className="text-xs text-gray-400">
          {hint}
        </div>
      )}

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, {
            id,
            "aria-describedby": ariaDescribedby,
            "aria-invalid": error ? "true" : undefined,
            "aria-required": required,
          })
        : children}

      {error && (
        <div id={errorId} className="text-xs text-[#FF6B6B]" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  )
}

