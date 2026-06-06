type ProjectListCardHeaderProps = {
  title: string
  statusLabel: string
  isCompleted: boolean
}

function CompletedCheckmark() {
  return (
    <span
      className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
      aria-hidden
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.414 0l-3.25-3.333a1 1 0 1 1 1.432-1.396L8.75 11.88l6.544-6.615a1 1 0 0 1 1.41 0Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  )
}

/** Dark title strip for project cards on the /projects list. */
export function ProjectListCardHeader({
  title,
  statusLabel,
  isCompleted,
}: ProjectListCardHeaderProps) {
  return (
    <div
      className={`relative bg-neutral-900 px-4 py-3 ${isCompleted ? 'pr-10' : ''}`}
    >
      {isCompleted && <CompletedCheckmark />}
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-lg text-white leading-snug min-w-0 flex-1">
          {title}
        </p>
        <span className="shrink-0 text-sm font-medium text-white pt-0.5">
          {statusLabel}
        </span>
      </div>
    </div>
  )
}
