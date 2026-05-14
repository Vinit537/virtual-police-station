import { createContext, useContext, useMemo, useState } from 'react'
import { Icon } from './icons'

const ROLE_THEME = {
  CITIZEN: 'var(--color-accent)',
  POLICE: '#2d52c4',
  ADMIN: '#0f766e',
}

const DesignSystemContext = createContext({ role: null, accent: ROLE_THEME.CITIZEN })

export function DesignSystemProvider({ role, children }) {
  const value = useMemo(() => ({ role, accent: ROLE_THEME[role] || ROLE_THEME.CITIZEN }), [role])
  return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>
}

export function useDesignSystem() {
  return useContext(DesignSystemContext)
}

export function Button({ variant = 'primary', size = 'md', className = '', icon, iconPos = 'left', children, ...props }) {
  const variantMap = {
    primary: 'ds-btn ds-btn-primary',
    secondary: 'ds-btn ds-btn-secondary',
    outline: 'ds-btn ds-btn-outline',
    ghost: 'ds-btn ds-btn-ghost',
  }
  const sizeMap = { xs: 'btn-xs', sm: 'btn-sm', md: '' }
  const iconNode = typeof icon === 'string' ? <Icon name={icon} size={16} /> : icon
  return (
    <button className={`${variantMap[variant] || variantMap.primary} ${sizeMap[size] || ''} ${className}`.trim()} {...props}>
      {icon && iconPos === 'left' ? iconNode : null}
      {children}
      {icon && iconPos === 'right' ? iconNode : null}
    </button>
  )
}

export function Input(props) {
  return <input className={`ds-input ${props.className || ''}`.trim()} {...props} />
}

export function Select(props) {
  return <select className={`ds-select ${props.className || ''}`.trim()} {...props} />
}

export function Textarea(props) {
  return <textarea className={`ds-textarea ${props.className || ''}`.trim()} {...props} />
}

export function Badge({ tone = 'info', children, className = '' }) {
  const map = {
    info: 'ds-badge ds-badge-info',
    warn: 'ds-badge ds-badge-warn',
    success: 'ds-badge ds-badge-success',
    danger: 'ds-badge ds-badge-danger',
    muted: 'ds-badge badge-gray',
  }
  return <span className={`${map[tone] || map.info} ${className}`.trim()}>{children}</span>
}

export function Alert({ tone = 'info', children, className = '' }) {
  const cls = tone === 'success' ? 'alert-success' : tone === 'error' ? 'alert-error' : 'alert-info'
  const iconName = tone === 'success' ? 'check' : tone === 'error' ? 'warning' : 'info'
  return (
    <div className={`ds-alert ${cls} flex items-start gap-2 ${className}`.trim()} role="status" aria-live="polite">
      <Icon name={iconName} size={16} className="mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`ds-card bg-white ${className}`.trim()}>{children}</div>
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`ds-card bg-white p-5 ${className}`.trim()}>
      {(title || action) && (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold text-policeBlue">{title}</h2>
            {action || null}
          </div>
          <div className="divider -mt-1 mb-4" />
        </>
      )}
      {children}
    </section>
  )
}

export function Tabs({ items, active, onChange }) {
  return (
    <div className="ds-tabs" role="tablist">
      {items.map((item) => (
        <button key={item.value} role="tab" aria-selected={active === item.value} className="ds-tab" onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function Table({ columns, rows, renderRow }) {
  return (
    <table className="data-table">
      <thead><tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr></thead>
      <tbody>{rows.map(renderRow)}</tbody>
    </table>
  )
}

export function Timeline({ items, renderTitle, renderMeta }) {
  if (!items.length) return null
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-lg border border-policeBlue-100 bg-policeBlue-50 p-3 text-sm">
          <p className="font-semibold text-policeBlue">{renderTitle(item)}</p>
          <p className="text-xs text-slate-500">{renderMeta(item)}</p>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-policeBlue">{typeof icon === 'string' ? <Icon name={icon} size={24} /> : (icon || <Icon name="info" size={24} />)}</span>
      <p className="font-semibold text-policeBlue">{title}</p>
      {description ? <p className="max-w-xs text-sm text-slate-500">{description}</p> : null}
    </div>
  )
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`.trim()} />
}

const ToastContext = createContext({ push: () => {} })
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = (tone, message) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, tone, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="ds-toast-region" aria-live="polite">
        {toasts.map((toast) => <Alert key={toast.id} tone={toast.tone}>{toast.message}</Alert>)}
      </div>
    </ToastContext.Provider>
  )
}
export function useToast() { return useContext(ToastContext) }

export function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="ds-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ds-modal-panel">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-policeBlue">{title}</h3>
          <Button variant="ghost" size="xs" onClick={onClose}>Close</Button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Drawer({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <>
      <div className="ds-modal-backdrop" onClick={onClose} />
      <aside className="ds-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-policeBlue">{title}</h3>
          <Button variant="ghost" size="xs" onClick={onClose}>Close</Button>
        </div>
        {children}
      </aside>
    </>
  )
}

export function PageTemplate({ title, subtitle, actions, children }) {
  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-policeBlue-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-policeBlue">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      {children}
    </section>
  )
}

export function OperationalSplitTemplate({ left, right }) {
  return <div className="grid gap-3 lg:grid-cols-[380px_1fr]">{left}{right}</div>
}

export function AuthTemplate({ children }) {
  return <section className="mx-auto w-full max-w-md rounded-2xl border border-policeBlue-100 bg-white p-6 shadow-panel">{children}</section>
}

export function FormWizardTemplate({ progress, children, footer }) {
  return (
    <Panel title="Guided Form">
      <div className="mb-4 rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-3">
        <div className="h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-policeBlue transition-all" style={{ width: `${progress}%` }} /></div>
      </div>
      {children}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Panel>
  )
}

export function DetailTemplate({ header, content, aside }) {
  return <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">{header}<div>{content}</div>{aside ? <aside>{aside}</aside> : null}</div>
}
