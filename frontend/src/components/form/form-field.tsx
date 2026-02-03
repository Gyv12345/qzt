import React from 'react'
import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface FormFieldProps {
  name: string
  label?: string
  placeholder?: string
  type?: string
  required?: boolean
  description?: string
  className?: string
}

export function FormField({
  name,
  label,
  placeholder,
  type = 'text',
  required = false,
  description,
  className,
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={cn(required && 'required')}>
          {label}
        </Label>
      )}
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={cn(error && 'border-red-500')}
      />
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error.message as string}
        </p>
      )}
    </div>
  )
}

// 文本域字段
interface FormTextAreaProps {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  description?: string
  rows?: number
  className?: string
}

export function FormTextArea({
  name,
  label,
  placeholder,
  required = false,
  description,
  rows = 3,
  className,
}: FormTextAreaProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={cn(required && 'required')}>
          {label}
        </Label>
      )}
      <textarea
        id={name}
        placeholder={placeholder}
        rows={rows}
        {...register(name)}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500'
        )}
      />
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error.message as string}
        </p>
      )}
    </div>
  )
}

// 选择字段
interface FormSelectProps {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  description?: string
  options: { value: string; label: string }[]
  className?: string
}

export function FormSelect({
  name,
  label,
  placeholder,
  required = false,
  description,
  options,
  className,
}: FormSelectProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={cn(required && 'required')}>
          {label}
        </Label>
      )}
      <select
        id={name}
        {...register(name)}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500'
        )}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error.message as string}
        </p>
      )}
    </div>
  )
}
