import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface FormFieldProps {
  name: string
  label?: string
  description?: string
  children: (props: { field: any }) => React.ReactNode
}

export function FormFieldWrapper({
  name,
  label,
  description,
  children,
}: FormFieldProps) {
  return (
    <ShadcnFormField
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>{children({ field })}</FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
