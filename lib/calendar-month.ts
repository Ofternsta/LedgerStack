export type CalendarCell = {
  date: Date
  day: number
  inMonth: boolean
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS
}

export function monthTitle(date: Date): string {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

export function buildMonthGrid(viewMonth: Date): CalendarCell[] {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = first.getDay()
  const cells: CalendarCell[] = []

  for (let i = startPad - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    cells.push({ date, day: date.getDate(), inMonth: false })
  }

  for (let day = 1; day <= lastDay; day++) {
    cells.push({ date: new Date(year, month, day), day, inMonth: true })
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - startPad - lastDay + 1
    const date = new Date(year, month + 1, nextDay)
    cells.push({ date, day: date.getDate(), inMonth: false })
  }

  return cells
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function monthRange(viewMonth: Date): { from: string; to: string } {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0)
}

export function shiftMonth(viewMonth: Date, delta: number): Date {
  return new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1)
}

export function isToday(date: Date): boolean {
  return sameCalendarDay(date, new Date())
}
