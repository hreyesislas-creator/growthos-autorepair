type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray'

const MAP: Record<string, BadgeVariant> = {
  // Appointment status
  pending:     'yellow',
  confirmed:   'blue',
  in_progress: 'purple',
  completed:   'green',
  cancelled:   'gray',
  no_show:     'red',
  // Work order
  ready:       'blue',
  invoiced:    'gray',
  // Estimate
  presented:   'yellow',
  reopened:    'yellow',
  authorized:  'blue',
  approved:    'green',
  declined:    'red',
  // Billing
  active:      'green',
  past_due:    'red',
  suspended:   'red',
  trial:       'yellow',
  // Inspection
  draft:       'gray',
  sent:        'blue',
  // Message
  delivered:   'green',
  failed:      'red',
  // Customer
  inactive:    'gray',
  // Team member (invite_status + is_active)
  invited:     'yellow',
}

interface BadgeProps {
  status: string
  label?: string
}

export default function StatusBadge({ status, label }: BadgeProps) {
  const variant: BadgeVariant = MAP[status] ?? 'gray'
  const text = label ?? status.replace(/_/g, ' ')
  return <span className={`badge badge-${variant}`}>{text}</span>
}
