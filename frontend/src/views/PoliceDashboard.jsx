import { useEffect, useMemo, useState } from 'react'
import { http } from '../api/http'
import { useAuth } from '../context/AuthContext'
import { extractApiError } from '../api/hooks'
import { Alert, PriorityBadge, StatusBadge } from '../ui/Shared'
import { EmptyState, LoadingSpinner, Panel, StatCard } from '../ui/Cards'
import { PageTemplate } from '../ui/DesignSystem'

const CLOSED_STATES = new Set(['CLOSED_CONFIRMED', 'CLOSED_AUTO_ACK'])
const PRESETS = {
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  ALL_OPEN: 'ALL_OPEN',
  MY_ASSIGNED: 'MY_ASSIGNED',
  CLOSED_ARCHIVE: 'CLOSED_ARCHIVE',
}

const BOARD_COLUMNS = [
  { key: 'DISPUTED_REVIEW', title: 'Disputed' },
  { key: 'AWAITING_CITIZEN_ACK', title: 'Awaiting Ack' },
  { key: 'INVESTIGATING', title: 'Investigating' },
  { key: 'UNDER_REVIEW', title: 'Review' },
  { key: 'SUBMITTED', title: 'Submitted' },
]

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function buildSlaLabel(fir) {
  if (fir.status !== 'AWAITING_CITIZEN_ACK' || !fir.acknowledgementDueAt) {
    return ''
  }
  const dueAt = new Date(fir.acknowledgementDueAt)
  const now = new Date()
  const diffHours = Math.floor((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60))
  if (diffHours < 0) return `Overdue ${Math.abs(diffHours)}h`
  if (diffHours <= 24) return `Due in ${diffHours}h`
  return `Due in ${Math.ceil(diffHours / 24)}d`
}

function buildRankScore(fir) {
  const dueMs = fir.acknowledgementDueAt ? new Date(fir.acknowledgementDueAt).getTime() : Number.MAX_SAFE_INTEGER
  const createdMs = fir.createdAt ? new Date(fir.createdAt).getTime() : 0
  const base = (() => {
    if (fir.status === 'DISPUTED_REVIEW') return 0
    if (fir.status === 'AWAITING_CITIZEN_ACK') return 1
    if (fir.status === 'INVESTIGATING') return 2
    if (fir.status === 'UNDER_REVIEW') return 3
    if (fir.status === 'SUBMITTED') return 4
    if (CLOSED_STATES.has(fir.status)) return 5
    return 6
  })()
  const timePart = fir.status === 'AWAITING_CITIZEN_ACK' ? dueMs : createdMs
  return base * 10_000_000_000_000 + timePart
}

function enrichCase(fir) {
  const slaLabel = buildSlaLabel(fir)
  const isActionRequired = fir.status === 'DISPUTED_REVIEW' || fir.status === 'AWAITING_CITIZEN_ACK'
  const rankScore = buildRankScore(fir)
  return { ...fir, slaLabel, isActionRequired, rankScore }
}

function caseMatchesSearch(fir, text) {
  if (!text.trim()) return true
  const q = text.trim().toLowerCase()
  const blob = [
    String(fir.id),
    fir.title,
    fir.description,
    fir.citizenName,
    fir.assignedStation,
    fir.assignedOfficerName,
    fir.status,
  ].join(' ').toLowerCase()
  return blob.includes(q)
}

function filterByPreset(fir, preset, userName) {
  if (preset === PRESETS.ACTION_REQUIRED) return fir.status === 'DISPUTED_REVIEW' || fir.status === 'AWAITING_CITIZEN_ACK'
  if (preset === PRESETS.ALL_OPEN) return !CLOSED_STATES.has(fir.status)
  if (preset === PRESETS.MY_ASSIGNED) {
    return !CLOSED_STATES.has(fir.status)
      && Boolean(fir.assignedOfficerName)
      && fir.assignedOfficerName.toLowerCase() === (userName || '').toLowerCase()
  }
  if (preset === PRESETS.CLOSED_ARCHIVE) return CLOSED_STATES.has(fir.status)
  return true
}

function nextBestActionText(fir) {
  if (!fir) return 'Select a case from inbox to start.'
  if (fir.status === 'DISPUTED_REVIEW') return 'Respond to citizen dispute and choose next state.'
  if (fir.status === 'AWAITING_CITIZEN_ACK') return 'Track acknowledgement SLA and prepare follow-up.'
  if (fir.status === 'INVESTIGATING') return 'Complete checklist and submit for citizen acknowledgement.'
  if (fir.status === 'UNDER_REVIEW') return 'Review details and begin investigation.'
  if (fir.status === 'SUBMITTED') return 'Move case to review and assign ownership.'
  return 'Case is closed and read-only.'
}

function WorkbenchTabs({ activeTab, setActiveTab, fir }) {
  const tabs = ['Overview', 'Evidence', 'Timeline', 'Actions']
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`btn btn-xs ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
          {tab === 'Evidence' ? ` (${fir.evidence?.length || 0})` : ''}
        </button>
      ))}
    </div>
  )
}

function Workbench({ fir, onRefresh }) {
  const [tab, setTab] = useState('Overview')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [resolvePayload, setResolvePayload] = useState({
    closureSummary: '',
    citizenSummary: '',
    officerNote: '',
    evidenceReviewed: false,
  })
  const [disputePayload, setDisputePayload] = useState({
    responseNote: '',
    nextStatus: 'INVESTIGATING',
    citizenSummary: '',
    officerNote: '',
    evidenceReviewed: false,
  })

  useEffect(() => {
    setResolvePayload({
      closureSummary: fir.closureSummary || '',
      citizenSummary: fir.citizenSummary || '',
      officerNote: fir.officerNote || '',
      evidenceReviewed: Boolean(fir.evidenceReviewedAt),
    })
    setDisputePayload({
      responseNote: '',
      nextStatus: 'INVESTIGATING',
      citizenSummary: fir.citizenSummary || '',
      officerNote: fir.officerNote || '',
      evidenceReviewed: Boolean(fir.evidenceReviewedAt),
    })
    setTab('Overview')
    setMessage('')
  }, [fir])

  const resolveChecklistValid = resolvePayload.evidenceReviewed
    && resolvePayload.closureSummary.trim().length > 0
    && resolvePayload.citizenSummary.trim().length > 0

  const submitResolve = async () => {
    if (!resolveChecklistValid) return
    setBusy(true)
    setMessage('')
    try {
      await http.post(`/police/fir/${fir.id}/resolve`, resolvePayload)
      setMessage('Case moved to Awaiting Citizen Acknowledgement.')
      await onRefresh()
    } catch (err) {
      setMessage(extractApiError(err, 'Resolve failed.'))
    } finally {
      setBusy(false)
    }
  }

  const submitDisputeResponse = async () => {
    if (!disputePayload.responseNote.trim()) {
      setMessage('Response note is required.')
      return
    }
    if (disputePayload.nextStatus === 'AWAITING_CITIZEN_ACK' && !disputePayload.citizenSummary.trim()) {
      setMessage('Citizen summary is required when resubmitting.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await http.post(`/police/fir/${fir.id}/dispute/respond`, disputePayload)
      setMessage('Dispute response submitted.')
      await onRefresh()
    } catch (err) {
      setMessage(extractApiError(err, 'Dispute response failed.'))
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

  return (
    <Panel title={`Case Workbench #${fir.id}`}>
      <div className="sticky top-0 z-10 mb-3 rounded-lg border border-policeBlue-200 bg-policeBlue-50 p-3 text-sm text-policeBlue">
        <span className="font-semibold">Next Best Action:</span> {nextBestActionText(fir)}
      </div>
      <WorkbenchTabs activeTab={tab} setActiveTab={setTab} fir={fir} />
      {message && <Alert type={message.includes('failed') || message.includes('required') ? 'error' : 'success'}>{message}</Alert>}

      {tab === 'Overview' && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={fir.status} />
            <PriorityBadge priority={fir.priority} />
            {fir.slaLabel && <span className="badge badge-gold">{fir.slaLabel}</span>}
          </div>
          <p><span className="font-semibold text-policeBlue">Title:</span> {fir.title}</p>
          <p><span className="font-semibold text-policeBlue">Citizen:</span> {fir.citizenName}</p>
          <p><span className="font-semibold text-policeBlue">Station:</span> {fir.assignedStation || '-'}</p>
          <p><span className="font-semibold text-policeBlue">Officer:</span> {fir.assignedOfficerName || 'Unassigned'}</p>
          <p className="text-slate-600">{fir.description}</p>
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
          )) : <EmptyState icon="EVID" title="No evidence uploaded" description="Citizen evidence files will appear here." />}
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="mt-3 space-y-2">
          {fir.logs?.length ? fir.logs.map((log, index) => (
            <div key={`${log.updatedAt}-${index}`} className="rounded-lg border border-policeBlue-100 bg-policeBlue-50 p-3 text-sm">
              <p className="font-semibold text-policeBlue">{log.status}</p>
              <p className="text-xs text-slate-500">{log.updatedBy} | {formatDate(log.updatedAt)}</p>
            </div>
          )) : <EmptyState icon="TIME" title="No timeline yet" description="Timeline updates will appear here." />}
        </div>
      )}

      {tab === 'Actions' && (
        <div className="mt-3">
          {fir.status === 'INVESTIGATING' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-policeBlue">Resolve Checklist (Mandatory)</p>
              <textarea data-testid="police-resolve-closure" aria-label="Internal Closure Note" className="input min-h-20" placeholder="Internal closure note" value={resolvePayload.closureSummary} onChange={(e) => setResolvePayload((p) => ({ ...p, closureSummary: e.target.value }))} />
              <textarea data-testid="police-resolve-citizen" aria-label="Citizen-facing Closure Summary" className="input min-h-20" placeholder="Citizen-facing closure summary" value={resolvePayload.citizenSummary} onChange={(e) => setResolvePayload((p) => ({ ...p, citizenSummary: e.target.value }))} />
              <textarea data-testid="police-resolve-officer" className="input min-h-20" placeholder="Officer note (optional)" value={resolvePayload.officerNote} onChange={(e) => setResolvePayload((p) => ({ ...p, officerNote: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input data-testid="police-resolve-evidence" type="checkbox" checked={resolvePayload.evidenceReviewed} onChange={(e) => setResolvePayload((p) => ({ ...p, evidenceReviewed: e.target.checked }))} />
                I confirm latest evidence has been reviewed.
              </label>
              <button type="button" data-testid="police-resolve-submit" className="btn btn-gold" disabled={busy || !resolveChecklistValid} onClick={submitResolve}>
                {busy ? 'Submitting...' : 'Mark Resolved and Send for Citizen Ack'}
              </button>
            </div>
          )}

          {fir.status === 'DISPUTED_REVIEW' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-policeBlue">Dispute Response (Same Officer First)</p>
              <textarea data-testid="police-dispute-response" className="input min-h-20" placeholder="Required response note" value={disputePayload.responseNote} onChange={(e) => setDisputePayload((p) => ({ ...p, responseNote: e.target.value }))} />
              <select data-testid="police-dispute-next-status" className="input" value={disputePayload.nextStatus} onChange={(e) => setDisputePayload((p) => ({ ...p, nextStatus: e.target.value }))}>
                <option value="INVESTIGATING">Back to Investigating</option>
                <option value="AWAITING_CITIZEN_ACK">Resubmit for Citizen Acknowledgement</option>
              </select>
              {disputePayload.nextStatus === 'AWAITING_CITIZEN_ACK' && (
                <textarea data-testid="police-dispute-citizen" className="input min-h-20" placeholder="Citizen-facing revised summary" value={disputePayload.citizenSummary} onChange={(e) => setDisputePayload((p) => ({ ...p, citizenSummary: e.target.value }))} />
              )}
              <textarea data-testid="police-dispute-officer" className="input min-h-20" placeholder="Officer note (optional)" value={disputePayload.officerNote} onChange={(e) => setDisputePayload((p) => ({ ...p, officerNote: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input data-testid="police-dispute-evidence" type="checkbox" checked={disputePayload.evidenceReviewed} onChange={(e) => setDisputePayload((p) => ({ ...p, evidenceReviewed: e.target.checked }))} />
                Evidence reviewed before dispute response.
              </label>
              <button type="button" data-testid="police-dispute-submit" className="btn btn-primary" disabled={busy} onClick={submitDisputeResponse}>
                {busy ? 'Submitting...' : 'Submit Dispute Response'}
              </button>
            </div>
          )}

          {fir.status !== 'INVESTIGATING' && fir.status !== 'DISPUTED_REVIEW' && (
            <EmptyState icon="OK" title="No state action required" description="Use queue actions to move this case to the next stage." />
          )}
        </div>
      )}
    </Panel>
  )
}

function InboxRow({ fir, active, onSelect, onMoveStatus }) {
  return (
    <div
      data-testid={`police-inbox-${fir.id}`}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${active ? 'border-policeBlue bg-policeBlue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-policeBlue">#{fir.id} {fir.title}</p>
        <PriorityBadge priority={fir.priority} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{fir.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={fir.status} />
        {fir.slaLabel && <span className="badge badge-gold">{fir.slaLabel}</span>}
        {fir.isActionRequired && <span className="badge badge-red">Needs Action</span>}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Citizen: {fir.citizenName || '-'} | Station: {fir.assignedStation || '-'}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" data-testid={`police-open-${fir.id}`} className="btn btn-xs btn-outline" onClick={() => onSelect(fir.id)}>Open</button>
        {fir.status === 'SUBMITTED' && <button type="button" data-testid={`police-move-review-${fir.id}`} className="btn btn-xs btn-outline" onClick={() => onMoveStatus(fir.id, 'UNDER_REVIEW')}>Move to Review</button>}
        {fir.status === 'UNDER_REVIEW' && <button type="button" data-testid={`police-start-investigation-${fir.id}`} className="btn btn-xs btn-primary" onClick={() => onMoveStatus(fir.id, 'INVESTIGATING')}>Start Investigation</button>}
      </div>
    </div>
  )
}

function CompactKanban({ cases, selectedCaseId, onSelect }) {
  const grouped = useMemo(() => {
    const map = new Map()
    BOARD_COLUMNS.forEach((col) => map.set(col.key, []))
    for (const fir of cases) {
      if (map.has(fir.status)) {
        map.get(fir.status).push(fir)
      }
    }
    return map
  }, [cases])

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
      {BOARD_COLUMNS.map((col) => (
        <div key={col.key} className="rounded-xl border border-policeBlue-100 bg-policeBlue-50/50 p-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-policeBlue">{col.title} ({grouped.get(col.key)?.length || 0})</p>
          <div className="space-y-2">
            {(grouped.get(col.key) || []).map((fir) => (
              <button
                type="button"
                key={fir.id}
                className={`w-full rounded-lg border p-2 text-left text-xs ${selectedCaseId === fir.id ? 'border-policeBlue bg-white' : 'border-slate-200 bg-white/80'}`}
                onClick={() => onSelect(fir.id)}
              >
                <p className="font-semibold text-policeBlue">#{fir.id} {fir.title}</p>
                <p className="line-clamp-2 text-slate-600">{fir.description}</p>
              </button>
            ))}
            {(grouped.get(col.key) || []).length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center text-[11px] text-slate-400">No cases</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PoliceDashboard() {
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [selectedCase, setSelectedCase] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePreset, setActivePreset] = useState(PRESETS.ACTION_REQUIRED)
  const [viewMode, setViewMode] = useState('inbox')
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [primaryPriority, setPrimaryPriority] = useState('')
  const [advanced, setAdvanced] = useState({
    station: '',
    assignee: '',
    slaBucket: '',
  })
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false))

  const loadQueue = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await http.get('/police/fir/queue', { params: {} })
      setQueue((data || []).map(enrichCase))
    } catch {
      try {
        const fallback = await http.get('/police/fir')
        setQueue((fallback.data || []).map(enrichCase))
        setError('Queue API fallback applied. Please restart backend to enable full filtered queue.')
      } catch (fallbackErr) {
        setError(extractApiError(fallbackErr, 'Failed to load police queue.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const loadCaseDetail = async (id) => {
    setSelectedCaseId(id)
    try {
      const { data } = await http.get(`/police/fir/${id}`)
      setSelectedCase(enrichCase(data))
    } catch (err) {
      setError(extractApiError(err, 'Failed to load case detail.'))
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const filteredCases = useMemo(() => {
    const now = Date.now()
    const items = queue.filter((fir) => {
      if (!filterByPreset(fir, activePreset, user?.name)) return false
      if (primaryPriority && fir.priority !== primaryPriority) return false
      if (!caseMatchesSearch(fir, search)) return false
      if (advanced.station && !(fir.assignedStation || '').toLowerCase().includes(advanced.station.trim().toLowerCase())) return false
      if (advanced.assignee && !(fir.assignedOfficerName || '').toLowerCase().includes(advanced.assignee.trim().toLowerCase())) return false
      if (advanced.slaBucket) {
        const dueMs = fir.acknowledgementDueAt ? new Date(fir.acknowledgementDueAt).getTime() : null
        const diffHours = dueMs == null ? null : Math.floor((dueMs - now) / (1000 * 60 * 60))
        if (advanced.slaBucket === 'OVERDUE' && !(fir.status === 'AWAITING_CITIZEN_ACK' && diffHours != null && diffHours < 0)) return false
        if (advanced.slaBucket === 'DUE_24H' && !(fir.status === 'AWAITING_CITIZEN_ACK' && diffHours != null && diffHours >= 0 && diffHours <= 24)) return false
        if (advanced.slaBucket === 'DUE_3D' && !(fir.status === 'AWAITING_CITIZEN_ACK' && diffHours != null && diffHours > 24 && diffHours <= 72)) return false
      }
      return true
    })
    return items.slice().sort((a, b) => a.rankScore - b.rankScore)
  }, [queue, activePreset, user?.name, primaryPriority, search, advanced])

  useEffect(() => {
    if (!filteredCases.length) {
      setSelectedCaseId(null)
      setSelectedCase(null)
      setMobileDetailOpen(false)
      return
    }
    const stillVisible = filteredCases.some((fir) => fir.id === selectedCaseId)
    if (!stillVisible) {
      loadCaseDetail(filteredCases[0].id)
    }
  }, [filteredCases])

  const stats = useMemo(() => ({
    totalOpen: queue.filter((fir) => !CLOSED_STATES.has(fir.status)).length,
    actionRequired: queue.filter((fir) => fir.isActionRequired).length,
    myAssigned: queue.filter((fir) => (fir.assignedOfficerName || '').toLowerCase() === (user?.name || '').toLowerCase() && !CLOSED_STATES.has(fir.status)).length,
  }), [queue, user?.name])

  const moveStatus = async (id, status) => {
    try {
      await http.patch(`/police/fir/${id}`, { status })
      await loadQueue()
      if (selectedCaseId === id) {
        await loadCaseDetail(id)
      }
    } catch (err) {
      setError(extractApiError(err, 'Status update failed.'))
    }
  }

  const refreshAll = async () => {
    await loadQueue()
    if (selectedCaseId) {
      await loadCaseDetail(selectedCaseId)
    }
  }

  return (
    <PageTemplate title="Police Operations" subtitle="Prioritized inbox and case workbench for synchronized citizen workflow">
      <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Open Cases" value={stats.totalOpen} tone="blue" />
        <StatCard title="Action Required" value={stats.actionRequired} tone="red" />
        <StatCard title="My Assigned" value={stats.myAssigned} tone="gold" />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Panel title="Police Operations">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`btn btn-xs ${activePreset === PRESETS.ACTION_REQUIRED ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActivePreset(PRESETS.ACTION_REQUIRED)}>Action Required</button>
            <button type="button" className={`btn btn-xs ${activePreset === PRESETS.ALL_OPEN ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActivePreset(PRESETS.ALL_OPEN)}>All Open</button>
            <button type="button" className={`btn btn-xs ${activePreset === PRESETS.MY_ASSIGNED ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActivePreset(PRESETS.MY_ASSIGNED)}>My Assigned</button>
            <button type="button" className={`btn btn-xs ${activePreset === PRESETS.CLOSED_ARCHIVE ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActivePreset(PRESETS.CLOSED_ARCHIVE)}>Closed Archive</button>
          </div>
          <div className="flex gap-2">
            <button type="button" className={`btn btn-xs ${viewMode === 'inbox' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode('inbox')}>Inbox</button>
            <button type="button" className={`btn btn-xs ${viewMode === 'kanban' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode('kanban')}>Kanban</button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input className="input" placeholder="Search FIR #, title, citizen, station..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={primaryPriority} onChange={(e) => setPrimaryPriority(e.target.value)}>
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
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <input className="input" placeholder="Station" value={advanced.station} onChange={(e) => setAdvanced((p) => ({ ...p, station: e.target.value }))} />
            <input className="input" placeholder="Assignee" value={advanced.assignee} onChange={(e) => setAdvanced((p) => ({ ...p, assignee: e.target.value }))} />
            <select className="input" value={advanced.slaBucket} onChange={(e) => setAdvanced((p) => ({ ...p, slaBucket: e.target.value }))}>
              <option value="">All SLA</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE_24H">Due in 24h</option>
              <option value="DUE_3D">Due in 3 days</option>
            </select>
          </div>
        )}

        {loading ? (
          <LoadingSpinner label="Loading queue..." />
        ) : filteredCases.length === 0 ? (
          <EmptyState icon="LIST" title="No cases in this view" description="Try a different preset or filter." />
        ) : (
          <div className="mt-4">
            {viewMode === 'kanban' ? (
              <CompactKanban cases={filteredCases} selectedCaseId={selectedCaseId} onSelect={loadCaseDetail} />
            ) : (
              <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
                {(!mobileDetailOpen || !isMobile) && (
                  <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
                    {filteredCases.map((fir) => (
                      <InboxRow
                        key={fir.id}
                        fir={fir}
                        active={selectedCaseId === fir.id}
                        onSelect={(id) => {
                          loadCaseDetail(id)
                          if (isMobile) setMobileDetailOpen(true)
                        }}
                        onMoveStatus={moveStatus}
                      />
                    ))}
                  </div>
                )}
                <div className={`${mobileDetailOpen ? 'block' : 'hidden'} lg:block`}>
                  {selectedCase ? (
                    <div className="space-y-3">
                      <button type="button" className="btn btn-xs btn-outline lg:hidden" onClick={() => setMobileDetailOpen(false)}>
                        Back to Inbox
                      </button>
                      <Workbench fir={selectedCase} onRefresh={refreshAll} />
                    </div>
                  ) : (
                    <EmptyState icon="CASE" title="Select a case" description="Choose a case from inbox to open workbench." />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>
      </div>
    </PageTemplate>
  )
}
