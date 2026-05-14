import { useEffect, useMemo, useState } from 'react'
import { http } from '../api/http'
import { extractApiError } from '../api/hooks'
import { Alert, PriorityBadge, StatusBadge } from '../ui/Shared'
import { EmptyState, LoadingSpinner, Panel, StatCard } from '../ui/Cards'
import { useTranslation } from '../i18n/LanguageContext'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { PageTemplate } from '../ui/DesignSystem'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const PRESETS = [
  { key: 'CRITICAL_ATTENTION', label: 'Critical Attention' },
  { key: 'SLA_BREACHES', label: 'SLA Breaches' },
  { key: 'DISPUTED_REVIEW_WATCH', label: 'Disputed Review Watch' },
  { key: 'AWAITING_CITIZEN_ACK_WATCH', label: 'Awaiting Citizen Ack Watch' },
  { key: 'CLOSED_AUDIT_ARCHIVE', label: 'Closed Audit Archive' },
]

const CHART_COLORS = [
  { border: 'rgba(45, 82, 196, 1)', bg: 'rgba(45, 82, 196, 0.15)' },
  { border: 'rgba(234, 179, 8, 1)', bg: 'rgba(234, 179, 8, 0.15)' },
  { border: 'rgba(16, 185, 129, 1)', bg: 'rgba(16, 185, 129, 0.15)' },
  { border: 'rgba(239, 68, 68, 1)', bg: 'rgba(239, 68, 68, 0.15)' },
]

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function toIsoOrNull(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

function nextAdminAction(detail) {
  if (!detail?.fir) return 'Select a case from inbox to begin triage.'
  if (detail.fir.status === 'DISPUTED_REVIEW') return 'Prioritize dispute oversight and ensure response SLA.'
  if (detail.isSlaBreached) return 'Escalate immediately and request police update with clear deadline.'
  if (detail.fir.status === 'AWAITING_CITIZEN_ACK') return 'Monitor acknowledgement deadline and trigger proactive reminder/escalation.'
  if (detail.fir.status === 'INVESTIGATING') return 'Review assignment, progress notes, and intervene only if risk increases.'
  if (detail.fir.status === 'UNDER_REVIEW') return 'Confirm ownership and move to active investigation readiness.'
  if (detail.fir.status === 'SUBMITTED') return 'Ensure rapid triage and responsible assignment.'
  return 'Case is in archive; use reopen only if supervisory review is required.'
}

function isClosedStatus(status) {
  return status === 'CLOSED_CONFIRMED' || status === 'CLOSED_AUTO_ACK'
}

function buildQueueStats(queue) {
  const open = queue.filter((item) => !isClosedStatus(item.status)).length
  const critical = queue.filter((item) => item.requiresAdminAttention).length
  const breached = queue.filter((item) => item.isSlaBreached).length
  return { open, critical, breached }
}

function CrimeTrendChart({ trendData, t }) {
  const chartData = useMemo(() => {
    if (!trendData.length) return null

    const labels = trendData.map((d) => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    })
    const categories = Object.keys(trendData[0]).filter((k) => k !== 'date' && k !== 'total')

    const datasets = [
      {
        label: t('adm_total_firs') || 'Total FIRs',
        data: trendData.map((d) => d.total),
        borderColor: 'rgba(13, 25, 71, 1)',
        backgroundColor: 'rgba(13, 25, 71, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
      ...categories.map((cat, i) => ({
        label: cat,
        data: trendData.map((d) => d[cat] || 0),
        borderColor: CHART_COLORS[i % CHART_COLORS.length].border,
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length].bg,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        borderDash: [5, 3],
      })),
    ]

    return { labels, datasets }
  }, [trendData, t])

  if (!chartData) return <EmptyState icon="TRND" title={t('adm_no_data') || 'No trend data yet'} />

  return (
    <div style={{ height: '300px' }}>
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
          },
        }}
      />
    </div>
  )
}

function CategoryBar({ items, t }) {
  if (!items.length) return <EmptyState icon="CAT" title={t('adm_no_data')} />
  const max = Math.max(...items.map((item) => item.count), 1)
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-policeBlue">{item.key}</span>
            <span className="font-bold text-policeBlue">{item.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-policeBlue-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-policeBlue-500 to-policeBlue-400 transition-all duration-700"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusBreakdown({ items, t }) {
  if (!items.length) return <EmptyState icon="STAT" title={t('adm_no_status_data')} />
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between rounded-lg border border-policeBlue-50 bg-surface px-4 py-2.5">
          <StatusBadge status={item.key} />
          <span className="font-heading text-xl font-bold text-policeBlue">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

function EventLog({ events, t }) {
  if (!events.length) return <EmptyState icon="EVNT" title={t('adm_no_events')} />
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {events.map((event, idx) => (
        <div key={`${event.createdAt}-${idx}`} className="rounded-lg border border-policeBlue-50 bg-surface px-3 py-2.5">
          <p className="text-xs font-semibold text-policeBlue">{event.eventType?.replace(/_/g, ' ')}</p>
          <p className="text-xs text-slate-600">{event.message}</p>
          <p className="text-[10px] text-slate-400">{formatDate(event.createdAt)}</p>
        </div>
      ))}
    </div>
  )
}

function InboxRow({ item, active, onSelect }) {
  return (
    <button
      type="button"
      data-testid={`admin-inbox-${item.id}`}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${active ? 'border-policeBlue bg-policeBlue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
      onClick={() => onSelect(item.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-policeBlue">#{item.id} {item.title}</p>
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={item.status} />
        {item.slaBucket && item.slaBucket !== 'NONE' && <span className="badge badge-gold">{item.slaBucket}</span>}
        {item.requiresAdminAttention && <span className="badge badge-red">Attention</span>}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Citizen: {item.citizenName} ({item.citizenAadhaarMasked}) | Officer: {item.assignedOfficerName || 'Unassigned'}
      </p>
      <p className="text-[11px] text-slate-500">
        Station: {item.assignedStation || '-'} | Ack due: {formatDate(item.acknowledgementDueAt)}
      </p>
    </button>
  )
}

function Workbench({ detail, officers, onActionSuccess }) {
  const [tab, setTab] = useState('Overview')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [reassign, setReassign] = useState({ officerId: '', station: '', reason: '' })
  const [priorityOverride, setPriorityOverride] = useState({ priority: 'HIGH', reason: '' })
  const [escalate, setEscalate] = useState({ note: '', dueAt: '' })
  const [requestUpdate, setRequestUpdate] = useState({ message: '', dueAt: '' })
  const [reopen, setReopen] = useState({ nextStatus: 'UNDER_REVIEW', reason: '' })

  useEffect(() => {
    setTab('Overview')
    setBusy(false)
    setMessage('')
    setError('')
    setReassign({ officerId: '', station: detail?.fir?.assignedStation || '', reason: '' })
    setPriorityOverride({ priority: detail?.fir?.priority || 'HIGH', reason: '' })
    setEscalate({ note: detail?.escalationReason || '', dueAt: detail?.escalationDueAt ? detail.escalationDueAt.slice(0, 16) : '' })
    setRequestUpdate({ message: '', dueAt: detail?.fir?.adminRequestUpdateDueAt ? detail.fir.adminRequestUpdateDueAt.slice(0, 16) : '' })
    setReopen({ nextStatus: 'UNDER_REVIEW', reason: '' })
  }, [detail?.fir?.id])

  const runAction = async (action) => {
    if (!detail?.fir?.id) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await action()
      setMessage('Admin intervention saved.')
      await onActionSuccess()
    } catch (err) {
      setError(extractApiError(err, 'Admin action failed.'))
    } finally {
      setBusy(false)
    }
  }

  const downloadEvidence = async (id, name) => {
    const response = await http.get(`/police/evidence/${id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }

  const fir = detail?.fir
  const commandApiAvailable = detail?.commandApiAvailable !== false
  if (!fir) return <EmptyState icon="CASE" title="Select a case" description="Pick a row from admin inbox." />

  return (
    <Panel title={`Admin Workbench #${fir.id}`}>
      <div className="sticky top-0 z-10 mb-3 rounded-lg border border-policeBlue-200 bg-policeBlue-50 p-3 text-sm text-policeBlue">
        <span className="font-semibold">Next Admin Action:</span> {nextAdminAction(detail)}
      </div>

      <div className="flex flex-wrap gap-2">
        {['Overview', 'Timeline', 'Evidence', 'Interventions'].map((item) => (
          <button
            key={item}
            type="button"
            className={`btn btn-xs ${tab === item ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {tab === 'Overview' && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={fir.status} />
            <PriorityBadge priority={fir.priority} />
            {detail.isSlaBreached && <span className="badge badge-red">SLA Breached</span>}
            {detail.slaBucket && detail.slaBucket !== 'NONE' && <span className="badge badge-gold">{detail.slaBucket}</span>}
          </div>
          <p><span className="font-semibold text-policeBlue">Title:</span> {fir.title}</p>
          <p><span className="font-semibold text-policeBlue">Citizen:</span> {fir.citizenName}</p>
          <p><span className="font-semibold text-policeBlue">Citizen Email:</span> {detail.citizenEmail}</p>
          <p><span className="font-semibold text-policeBlue">Aadhaar (full):</span> {detail.citizenAadhaar}</p>
          <p><span className="font-semibold text-policeBlue">Officer:</span> {fir.assignedOfficerName || 'Unassigned'}</p>
          <p><span className="font-semibold text-policeBlue">Station:</span> {fir.assignedStation || '-'}</p>
          <p><span className="font-semibold text-policeBlue">Ack due:</span> {formatDate(fir.acknowledgementDueAt)}</p>
          <p><span className="font-semibold text-policeBlue">Escalation due:</span> {formatDate(detail.escalationDueAt)}</p>
          <p className="text-slate-600">{fir.description}</p>
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="mt-3 space-y-2">
          {fir.logs?.length ? fir.logs.map((log, index) => (
            <div key={`${log.updatedAt}-${index}`} className="rounded-lg border border-policeBlue-100 bg-policeBlue-50 p-3 text-sm">
              <p className="font-semibold text-policeBlue">{log.status}</p>
              <p className="text-xs text-slate-500">{log.updatedBy} | {formatDate(log.updatedAt)}</p>
            </div>
          )) : <EmptyState icon="TIME" title="No timeline yet" description="Case timeline will appear here." />}
        </div>
      )}

      {tab === 'Evidence' && (
        <div className="mt-3 space-y-2">
          {fir.evidence?.length ? fir.evidence.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div>
                <p className="font-medium text-policeBlue">{item.fileName}</p>
                <p className="text-xs text-slate-500">{item.fileType} | {Math.round((item.fileSizeBytes || 0) / 1024)} KB | {formatDate(item.uploadedAt)}</p>
              </div>
              <button type="button" className="btn btn-xs btn-outline" onClick={() => downloadEvidence(item.id, item.fileName)}>Download</button>
            </div>
          )) : <EmptyState icon="EVID" title="No evidence files" description="Evidence uploaded by citizen/police appears here." />}
        </div>
      )}

      {tab === 'Interventions' && (
        <div className="mt-3 space-y-5">
          {!commandApiAvailable && (
            <Alert type="error">
              Full admin interventions require updated backend command APIs. Queue/workbench is in compatibility mode.
            </Alert>
          )}
          {!isClosedStatus(fir.status) && (
            <>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-policeBlue">Reassign Officer / Station</p>
                <select data-testid="admin-reassign-officer" className="input" value={reassign.officerId} onChange={(e) => setReassign((p) => ({ ...p, officerId: e.target.value }))}>
                  <option value="">Keep officer unchanged</option>
                  {officers.map((officer) => (
                    <option key={officer.id} value={officer.id}>{officer.user?.fullName} | {officer.stationName}</option>
                  ))}
                </select>
                <input data-testid="admin-reassign-station" className="input" placeholder="Station override (optional)" value={reassign.station} onChange={(e) => setReassign((p) => ({ ...p, station: e.target.value }))} />
                <input data-testid="admin-reassign-reason" className="input" placeholder="Reason (optional)" value={reassign.reason} onChange={(e) => setReassign((p) => ({ ...p, reason: e.target.value }))} />
                <button
                  type="button"
                  data-testid="admin-reassign-submit"
                  className="btn btn-outline"
                  disabled={busy || !commandApiAvailable}
                  onClick={() => runAction(() => http.post(`/admin/command/fir/${fir.id}/reassign`, {
                    officerId: reassign.officerId ? Number(reassign.officerId) : null,
                    station: reassign.station || null,
                    reason: reassign.reason || null,
                  }))}
                >
                  {busy ? 'Saving...' : 'Apply Reassignment'}
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-policeBlue">Priority Override</p>
                <select data-testid="admin-priority-select" className="input" value={priorityOverride.priority} onChange={(e) => setPriorityOverride((p) => ({ ...p, priority: e.target.value }))}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
                <textarea data-testid="admin-priority-reason" className="input min-h-20" placeholder="Reason (required)" value={priorityOverride.reason} onChange={(e) => setPriorityOverride((p) => ({ ...p, reason: e.target.value }))} />
                <button
                  type="button"
                  data-testid="admin-priority-submit"
                  className="btn btn-gold"
                  disabled={busy || !priorityOverride.reason.trim() || !commandApiAvailable}
                  onClick={() => runAction(() => http.post(`/admin/command/fir/${fir.id}/priority-override`, {
                    priority: priorityOverride.priority,
                    reason: priorityOverride.reason.trim(),
                  }))}
                >
                  {busy ? 'Saving...' : 'Override Priority'}
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-policeBlue">Escalate Case</p>
                <textarea data-testid="admin-escalate-note" className="input min-h-20" placeholder="Escalation note (required)" value={escalate.note} onChange={(e) => setEscalate((p) => ({ ...p, note: e.target.value }))} />
                <input data-testid="admin-escalate-due" type="datetime-local" className="input" value={escalate.dueAt} onChange={(e) => setEscalate((p) => ({ ...p, dueAt: e.target.value }))} />
                <button
                  type="button"
                  data-testid="admin-escalate-submit"
                  className="btn btn-primary"
                  disabled={busy || !escalate.note.trim() || !commandApiAvailable}
                  onClick={() => runAction(() => http.post(`/admin/command/fir/${fir.id}/escalate`, {
                    note: escalate.note.trim(),
                    dueAt: toIsoOrNull(escalate.dueAt),
                  }))}
                >
                  {busy ? 'Saving...' : 'Escalate'}
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-policeBlue">Request Police Update</p>
                <textarea data-testid="admin-update-message" className="input min-h-20" placeholder="Message to police (required)" value={requestUpdate.message} onChange={(e) => setRequestUpdate((p) => ({ ...p, message: e.target.value }))} />
                <input data-testid="admin-update-due" type="datetime-local" className="input" value={requestUpdate.dueAt} onChange={(e) => setRequestUpdate((p) => ({ ...p, dueAt: e.target.value }))} />
                <button
                  type="button"
                  data-testid="admin-update-submit"
                  className="btn btn-outline"
                  disabled={busy || !requestUpdate.message.trim() || !commandApiAvailable}
                  onClick={() => runAction(() => http.post(`/admin/command/fir/${fir.id}/request-update`, {
                    message: requestUpdate.message.trim(),
                    dueAt: toIsoOrNull(requestUpdate.dueAt),
                  }))}
                >
                  {busy ? 'Saving...' : 'Request Update'}
                </button>
              </div>
            </>
          )}

          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-policeBlue">Reopen For Review</p>
            <select data-testid="admin-reopen-status" className="input" value={reopen.nextStatus} onChange={(e) => setReopen((p) => ({ ...p, nextStatus: e.target.value }))}>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
            </select>
            <textarea data-testid="admin-reopen-reason" className="input min-h-20" placeholder="Audit reason (required)" value={reopen.reason} onChange={(e) => setReopen((p) => ({ ...p, reason: e.target.value }))} />
            <button
              type="button"
              data-testid="admin-reopen-submit"
              className="btn btn-primary"
              disabled={busy || !reopen.reason.trim() || !commandApiAvailable}
              onClick={() => runAction(() => http.post(`/admin/command/fir/${fir.id}/reopen-review`, {
                nextStatus: reopen.nextStatus,
                reason: reopen.reason.trim(),
              }))}
            >
              {busy ? 'Saving...' : 'Reopen Case'}
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}

export function AdminDashboard() {
  const { t } = useTranslation()
  const [preset, setPreset] = useState('CRITICAL_ATTENTION')
  const [queue, setQueue] = useState([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueError, setQueueError] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [stats, setStats] = useState({ users: 0, officers: 0, firs: 0, activeCases: 0 })
  const [firByCategory, setFirByCategory] = useState([])
  const [firByStatus, setFirByStatus] = useState([])
  const [events, setEvents] = useState([])
  const [crimeTrend, setCrimeTrend] = useState([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [officers, setOfficers] = useState([])
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [advanced, setAdvanced] = useState({ status: '', station: '', assignee: '', slaBucket: '', escalated: '' })
  const [lastRefreshAt, setLastRefreshAt] = useState(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false))

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const [analyticsRes, eventsRes, trendRes, officersRes] = await Promise.all([
        http.get('/admin/analytics'),
        http.get('/admin/events'),
        http.get('/admin/crime-trend'),
        http.get('/admin/officers'),
      ])
      setStats(analyticsRes.data.stats || { users: 0, officers: 0, firs: 0, activeCases: 0 })
      setFirByCategory(analyticsRes.data.firByCategory || [])
      setFirByStatus(analyticsRes.data.firByStatus || [])
      setEvents(eventsRes.data || [])
      setCrimeTrend(trendRes.data || [])
      setOfficers(officersRes.data || [])
    } catch (err) {
      setQueueError(extractApiError(err, 'Failed to load analytics data.'))
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const loadQueue = async () => {
    setQueueLoading(true)
    setQueueError('')
    try {
      const params = {
        preset,
        status: advanced.status || undefined,
        priority: priority || undefined,
        station: advanced.station || undefined,
        assignee: advanced.assignee || undefined,
        slaBucket: advanced.slaBucket || undefined,
        escalated: advanced.escalated === '' ? undefined : advanced.escalated === 'true',
      }
      const { data } = await http.get('/admin/command/queue', { params })
      setQueue(data || [])
      setLastRefreshAt(new Date())
    } catch {
      try {
        const fallback = await http.get('/police/fir')
        const mapped = (fallback.data || []).map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          status: item.status,
          priority: item.priority,
          assignedStation: item.assignedStation,
          citizenName: item.citizenName || 'Citizen',
          citizenAadhaarMasked: '************',
          assignedOfficerName: item.assignedOfficerName,
          createdAt: item.createdAt,
          acknowledgementDueAt: item.acknowledgementDueAt,
          isSlaBreached: false,
          slaBucket: 'NONE',
          requiresAdminAttention: item.status === 'DISPUTED_REVIEW' || item.status === 'AWAITING_CITIZEN_ACK',
          pendingCitizenAckHours: 0,
          escalatedAt: null,
          escalatedBy: null,
          escalationReason: '',
          escalationDueAt: null,
          lastPoliceActionAt: item.lastOfficerActionAt || null,
          lastCitizenActionAt: item.acknowledgedAt || item.disputedAt || item.createdAt || null,
          lastAdminActionAt: null,
          adminNotePreview: '',
        }))
        setQueue(mapped)
        setQueueError('Command API fallback applied. Restart backend with latest build to enable full admin interventions.')
        setLastRefreshAt(new Date())
      } catch (fallbackErr) {
        setQueueError(extractApiError(fallbackErr, 'Failed to load command queue.'))
      }
    } finally {
      setQueueLoading(false)
    }
  }

  const loadDetail = async (id) => {
    setDetailLoading(true)
    setDetailError('')
    setSelectedCaseId(id)
    try {
      const { data } = await http.get(`/admin/command/fir/${id}`)
      setDetail({ ...data, commandApiAvailable: true })
    } catch {
      try {
        const fallback = await http.get(`/police/fir/${id}`)
        setDetail({
          fir: fallback.data,
          citizenEmail: 'Masked in compatibility mode',
          citizenAadhaar: '************',
          isSlaBreached: false,
          slaBucket: 'NONE',
          requiresAdminAttention: fallback.data?.status === 'DISPUTED_REVIEW' || fallback.data?.status === 'AWAITING_CITIZEN_ACK',
          pendingCitizenAckHours: 0,
          escalatedAt: null,
          escalatedBy: null,
          escalationReason: '',
          escalationDueAt: null,
          lastPoliceActionAt: fallback.data?.lastOfficerActionAt || null,
          lastCitizenActionAt: fallback.data?.acknowledgedAt || fallback.data?.disputedAt || fallback.data?.createdAt || null,
          lastAdminActionAt: null,
          adminNotePreview: '',
          commandApiAvailable: false,
        })
      } catch (fallbackErr) {
        setDetailError(extractApiError(fallbackErr, 'Failed to load case detail.'))
      }
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  useEffect(() => {
    loadQueue()
  }, [preset, priority, advanced.status, advanced.station, advanced.assignee, advanced.slaBucket, advanced.escalated])

  useEffect(() => {
    if (!queue.length) {
      setSelectedCaseId(null)
      setDetail(null)
      setMobileDetailOpen(false)
      return
    }
    const visible = queue.some((item) => item.id === selectedCaseId)
    if (!visible) {
      loadDetail(queue[0].id)
    }
  }, [queue])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      loadQueue()
      if (selectedCaseId) {
        loadDetail(selectedCaseId)
      }
    }, 30_000)
    return () => clearInterval(timer)
  }, [selectedCaseId, preset, priority, advanced.status, advanced.station, advanced.assignee, advanced.slaBucket, advanced.escalated])

  const filteredQueue = useMemo(() => {
    if (!search.trim()) return queue
    const q = search.trim().toLowerCase()
    return queue.filter((item) => (
      `${item.id} ${item.title} ${item.description} ${item.citizenName} ${item.assignedStation || ''} ${item.assignedOfficerName || ''}`
        .toLowerCase()
        .includes(q)
    ))
  }, [queue, search])

  const queueStats = useMemo(() => buildQueueStats(queue), [queue])

  const refreshNow = async () => {
    await loadQueue()
    if (selectedCaseId) await loadDetail(selectedCaseId)
    await loadAnalytics()
  }

  return (
    <PageTemplate title="Admin Command Centre" subtitle="Operations-first supervisory hub with triage, interventions, and analytics">
      <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Open Cases" value={queueStats.open} tone="blue" />
        <StatCard title="Critical Attention" value={queueStats.critical} tone="red" />
        <StatCard title="SLA Breaches" value={queueStats.breached} tone="gold" />
      </div>

      {(queueError || detailError) && <Alert type="error">{queueError || detailError}</Alert>}

      <Panel
        title="Admin Command Centre"
        action={(
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Last update: {lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : '-'}</span>
            <button type="button" className="btn btn-xs btn-outline" onClick={refreshNow}>Refresh</button>
          </div>
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`btn btn-xs ${preset === item.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPreset(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input className="input" placeholder="Search FIR #, title, citizen, station..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <button type="button" className="btn btn-outline" onClick={() => setAdvancedFiltersOpen((v) => !v)}>
            {advancedFiltersOpen ? 'Hide Advanced Filters' : 'Advanced Filters'}
          </button>
        </div>

        {advancedFiltersOpen && (
          <div className="mt-3 grid gap-2 md:grid-cols-5">
            <select className="input" value={advanced.status} onChange={(e) => setAdvanced((p) => ({ ...p, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="AWAITING_CITIZEN_ACK">AWAITING_CITIZEN_ACK</option>
              <option value="DISPUTED_REVIEW">DISPUTED_REVIEW</option>
              <option value="CLOSED_CONFIRMED">CLOSED_CONFIRMED</option>
              <option value="CLOSED_AUTO_ACK">CLOSED_AUTO_ACK</option>
            </select>
            <input className="input" placeholder="Station" value={advanced.station} onChange={(e) => setAdvanced((p) => ({ ...p, station: e.target.value }))} />
            <input className="input" placeholder="Assignee" value={advanced.assignee} onChange={(e) => setAdvanced((p) => ({ ...p, assignee: e.target.value }))} />
            <select className="input" value={advanced.slaBucket} onChange={(e) => setAdvanced((p) => ({ ...p, slaBucket: e.target.value }))}>
              <option value="">All SLA</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="DUE_24H">DUE_24H</option>
              <option value="DUE_3D">DUE_3D</option>
              <option value="OPEN">OPEN</option>
              <option value="NONE">NONE</option>
            </select>
            <select className="input" value={advanced.escalated} onChange={(e) => setAdvanced((p) => ({ ...p, escalated: e.target.value }))}>
              <option value="">Escalated: All</option>
              <option value="true">Escalated Only</option>
              <option value="false">Not Escalated</option>
            </select>
          </div>
        )}

        {queueLoading ? (
          <LoadingSpinner label="Loading admin command queue..." />
        ) : filteredQueue.length === 0 ? (
          <EmptyState icon="INBX" title="No cases in this inbox view" description="Try another preset or filters." />
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-[390px_1fr]">
            {(!mobileDetailOpen || !isMobile) && (
              <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
                {filteredQueue.map((item) => (
                  <InboxRow
                    key={item.id}
                    item={item}
                    active={selectedCaseId === item.id}
                    onSelect={(id) => {
                      loadDetail(id)
                      if (isMobile) setMobileDetailOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
            <div className={`${mobileDetailOpen ? 'block' : 'hidden'} lg:block`}>
              {detailLoading ? (
                <LoadingSpinner label="Loading case workbench..." />
              ) : detail ? (
                <div className="space-y-3">
                  <button type="button" className="btn btn-xs btn-outline lg:hidden" onClick={() => setMobileDetailOpen(false)}>
                    Back to Inbox
                  </button>
                  <Workbench detail={detail} officers={officers} onActionSuccess={refreshNow} />
                </div>
              ) : (
                <EmptyState icon="CASE" title="Select a case" description="Choose a case from inbox to open workbench." />
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel title={t('adm_analytics') || 'System Analytics'}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t('adm_users')} value={stats.users} tone="blue" />
          <StatCard title={t('adm_officers')} value={stats.officers} tone="gold" />
          <StatCard title={t('adm_firs')} value={stats.firs} tone="green" />
          <StatCard title={t('adm_active')} value={stats.activeCases} tone="blue" />
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Panel title={t('adm_crime_trend') || 'Crime Trend'}>
            {analyticsLoading ? <LoadingSpinner label={t('loading')} /> : <CrimeTrendChart trendData={crimeTrend} t={t} />}
          </Panel>
          <Panel title={t('adm_by_status')}>
            {analyticsLoading ? <LoadingSpinner label={t('loading')} /> : <StatusBreakdown items={firByStatus} t={t} />}
          </Panel>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <Panel title={t('adm_by_category')}>
            {analyticsLoading ? <LoadingSpinner label={t('loading')} /> : <CategoryBar items={firByCategory} t={t} />}
          </Panel>
          <Panel title={t('adm_event_log')}>
            {analyticsLoading ? <LoadingSpinner label={t('loading')} /> : <EventLog events={events} t={t} />}
          </Panel>
        </div>
      </Panel>
      </div>
    </PageTemplate>
  )
}
