import { createFileRoute } from '@tanstack/react-router'
import { Automation } from '@/features/automation'

export const Route = createFileRoute('/_authenticated/automation')({
  component: Automation,
})
