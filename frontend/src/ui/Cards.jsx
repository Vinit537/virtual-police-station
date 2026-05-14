import { Card, EmptyState, Panel, Skeleton } from './DesignSystem'
import { Icon } from './icons'

const TONE_MAP = {
  blue: {
    wrapper: 'from-policeBlue-700 to-policeBlue-500',
    icon: 'bg-white/20',
    text: 'text-white',
    sub: 'text-policeBlue-100',
    iconName: 'info',
  },
  gold: {
    wrapper: 'from-policeGold-400 to-policeGold-300',
    icon: 'bg-policeBlue-900/20',
    text: 'text-policeBlue-900',
    sub: 'text-policeBlue-700',
    iconName: 'warning',
  },
  green: {
    wrapper: 'from-emerald-600 to-emerald-400',
    icon: 'bg-white/20',
    text: 'text-white',
    sub: 'text-emerald-100',
    iconName: 'check',
  },
  red: {
    wrapper: 'from-rose-600 to-rose-400',
    icon: 'bg-white/20',
    text: 'text-white',
    sub: 'text-rose-100',
    iconName: 'warning',
  },
}

export function StatCard({ title, value, tone = 'blue', icon, subtitle }) {
  const t = TONE_MAP[tone] ?? TONE_MAP.blue
  const iconNode = typeof icon === 'string' ? <Icon name={icon} size={20} /> : (icon ?? <Icon name={t.iconName} size={20} />)
  return (
    <Card className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.wrapper} p-5 shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-float`}>
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/8" />
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${t.sub}`}>{title}</p>
          <p className={`mt-1.5 font-heading text-3xl font-bold ${t.text}`}>{value ?? '-'}</p>
          {subtitle && <p className={`mt-1 text-xs ${t.sub}`}>{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.icon} ${t.text}`}>{iconNode}</div>
      </div>
    </Card>
  )
}

export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-policeBlue-400" role="status" aria-live="polite">
      <svg className="h-8 w-8 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export { Panel, EmptyState, Skeleton }
