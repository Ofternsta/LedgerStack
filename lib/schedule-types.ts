export const SCHEDULE_EVENT_TYPES = [
  'inspection',
  'deadline',
  'reminder',
  'insurance_followup',
  'assignment',
  'other',
] as const

export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number]

export const SCHEDULE_EVENT_LABELS: Record<ScheduleEventType, string> = {
  inspection: 'Inspection',
  deadline: 'Deadline',
  reminder: 'Reminder',
  insurance_followup: 'Insurance follow-up',
  assignment: 'Worker assignment',
  other: 'Other',
}

export function isScheduleEventType(value: string): value is ScheduleEventType {
  return SCHEDULE_EVENT_TYPES.includes(value as ScheduleEventType)
}
