import { useTranslation } from '../i18n/LanguageContext'
import { Alert as DsAlert, Badge } from './DesignSystem'
import { Icon } from './icons'

const STATUS_MAP = {
  SUBMITTED: { key: 'status_submitted', tone: 'info' },
  UNDER_REVIEW: { key: 'status_review', tone: 'warn' },
  INVESTIGATING: { key: 'status_investigating', tone: 'info' },
  RESOLVED: { key: 'status_resolved', tone: 'success' },
  AWAITING_CITIZEN_ACK: { key: null, tone: 'warn' },
  DISPUTED_REVIEW: { key: null, tone: 'danger' },
  CLOSED_CONFIRMED: { key: null, tone: 'success' },
  CLOSED_AUTO_ACK: { key: null, tone: 'muted' },
  REJECTED: { key: 'status_rejected', tone: 'danger' },
}

const PRIORITY_MAP = {
  LOW: { key: 'priority_low', tone: 'muted' },
  MEDIUM: { key: 'priority_medium', tone: 'warn' },
  HIGH: { key: 'priority_high', tone: 'danger' },
  CRITICAL: { key: 'priority_critical', tone: 'danger' },
}

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const { key, tone } = STATUS_MAP[status] ?? { key: null, tone: 'muted' }
  return <Badge tone={tone}>{key ? t(key) : status}</Badge>
}

export function PriorityBadge({ priority }) {
  const { t } = useTranslation()
  const { key, tone } = PRIORITY_MAP[priority] ?? { key: null, tone: 'muted' }
  return <Badge tone={tone}>{key ? t(key) : priority}</Badge>
}

const STEPS = ['SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATING', 'AWAITING_CITIZEN_ACK', 'CLOSED_CONFIRMED']
export function StatusTimeline({ status }) {
  const { t } = useTranslation()
  const normalizedStatus = ({
    RESOLVED: 'AWAITING_CITIZEN_ACK',
    DISPUTED_REVIEW: 'AWAITING_CITIZEN_ACK',
    CLOSED_AUTO_ACK: 'CLOSED_CONFIRMED',
  }[status] ?? status)
  const currentIndex = Math.max(0, STEPS.indexOf(normalizedStatus))

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, index) => {
        const done = index < currentIndex
        const current = index === currentIndex
        return (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 transition-all ${done ? 'bg-ok ring-ok/30 text-white' : current ? 'bg-policeBlue ring-policeBlue/30 text-white' : 'bg-white ring-slate-200 text-slate-400'}`}>
                {done ? <Icon name="check" size={12} /> : index + 1}
              </div>
              <span className={`mt-1 text-center text-[10px] font-semibold leading-tight ${done || current ? 'text-policeBlue' : 'text-slate-400'}`}>
                {STATUS_MAP[step]?.key ? t(STATUS_MAP[step].key) : step.replace('_', ' ')}
              </span>
            </div>
            {index < STEPS.length - 1 && <div className={`h-0.5 flex-1 transition-all ${done ? 'bg-ok' : 'bg-slate-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

export function Field({ label, error, children, tip, help }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {tip ? <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-policeBlue/10 text-[10px] font-bold text-policeBlue" title={tip}>?</span> : null}
      </label>
      {children}
      {help ? <span className="field-help">{help}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}

export function Alert({ type = 'info', children }) {
  const tone = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'
  return <DsAlert tone={tone}>{children}</DsAlert>
}
