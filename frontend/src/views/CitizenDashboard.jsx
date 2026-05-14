import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { http } from '../api/http'
import { extractApiError, useFirs } from '../api/hooks'
import { Panel, StatCard, LoadingSpinner, EmptyState } from '../ui/Cards'
import { Alert, PriorityBadge, StatusBadge, StatusTimeline } from '../ui/Shared'
import { PageTemplate } from '../ui/DesignSystem'

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const MAX_FILE_BYTES = 25 * 1024 * 1024
const ACCEPTED_EVIDENCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'txt', 'doc', 'docx', 'rtf', 'odt']

function useVoiceInput() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

  const start = () => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (event) => setError(`Voice error: ${event.error}`)
    recognition.onresult = (event) => {
      let next = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        next += `${event.results[index][0].transcript} `
      }
      setTranscript((prev) => `${prev}${next}`)
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  const stop = () => recognitionRef.current?.stop()
  const clear = () => {
    setTranscript('')
    setError('')
  }

  return { listening, transcript, error, supported: !!SpeechRecognition, start, stop, clear }
}

function validateEvidenceFile(file) {
  if (!file) return 'Please choose an evidence file.'
  if (file.size > MAX_FILE_BYTES) return 'File too large. Maximum allowed size is 25 MB.'
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
  if (!ACCEPTED_EVIDENCE_EXTENSIONS.includes(extension)) {
    return 'Unsupported evidence type. Use JPG, PNG, PDF, TXT, DOC, DOCX, RTF, or ODT.'
  }
  return null
}

function AccessibilityControls() {
  const [largeText, setLargeText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-policeBlue-100 bg-white p-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-policeBlue-500">Accessibility</span>
      <button type="button" className={`btn btn-xs ${largeText ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLargeText((v) => !v)}>
        {largeText ? 'Normal Text' : 'Large Text'}
      </button>
      <button type="button" className={`btn btn-xs ${highContrast ? 'btn-primary' : 'btn-outline'}`} onClick={() => setHighContrast((v) => !v)}>
        {highContrast ? 'Normal Contrast' : 'High Contrast'}
      </button>
      <div className={`w-full rounded-lg px-3 py-2 text-xs ${highContrast ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'} ${largeText ? 'text-sm' : ''}`}>
        Keyboard shortcuts are supported across wizard steps and case actions. Screen-reader labels are enabled for all primary controls.
      </div>
    </div>
  )
}

function CitizenHome({ firs, onFileAction, onCasesAction, onResumeDraft }) {
  const awaitingAck = firs.filter((fir) => fir.status === 'AWAITING_CITIZEN_ACK').length
  const pendingEvidence = firs.filter((fir) => fir.status !== 'CLOSED_CONFIRMED' && fir.status !== 'CLOSED_AUTO_ACK').length

  return (
    <div className="space-y-4">
      <Panel title="Next Actions">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" data-testid="citizen-file-fir" onClick={onFileAction} className="rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-4 text-left hover:bg-policeBlue-100">
            <p className="font-semibold text-policeBlue">File Complaint</p>
            <p className="mt-1 text-xs text-slate-600">Start a guided FIR wizard.</p>
          </button>
          <button type="button" data-testid="citizen-resume-draft" onClick={onResumeDraft} className="rounded-xl border border-policeBlue-100 bg-white p-4 text-left hover:bg-slate-50">
            <p className="font-semibold text-policeBlue">Continue Draft</p>
            <p className="mt-1 text-xs text-slate-600">Resume your latest saved draft.</p>
          </button>
          <button type="button" data-testid="citizen-upload-evidence" onClick={onCasesAction} className="rounded-xl border border-policeBlue-100 bg-white p-4 text-left hover:bg-slate-50">
            <p className="font-semibold text-policeBlue">Upload Evidence</p>
            <p className="mt-1 text-xs text-slate-600">Attach files from case details.</p>
          </button>
          <button type="button" data-testid="citizen-pending-ack" onClick={onCasesAction} className="rounded-xl border border-policeBlue-100 bg-amber-50 p-4 text-left hover:bg-amber-100">
            <p className="font-semibold text-amber-700">Pending Acknowledgement</p>
            <p className="mt-1 text-xs text-slate-600">{awaitingAck} case(s) need your response.</p>
          </button>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Cases" value={firs.length} tone="blue" />
        <StatCard title="Needs Evidence/Follow-up" value={pendingEvidence} tone="gold" />
        <StatCard title="Pending Acknowledgement" value={awaitingAck} tone="red" />
      </div>

      <Panel title="Trust and Privacy">
        <p className="text-sm text-slate-600">
          FIR submissions are JWT-authenticated and stamped with a digital signature hash. Personal information is stored securely and visible only to authorized roles.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          If your case needs escalation, use dispute flow on the case detail page or contact assigned station support.
        </p>
      </Panel>
    </div>
  )
}

function FirWizard({ onSubmitted, resumeSignal }) {
  const { register, setValue, getValues, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      location: '',
      aadhaarNumber: '',
      ocrExtractedText: '',
      ocrKeywords: '',
      suggestedCategory: '',
      suggestedPriority: '',
    },
  })
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState(null)
  const [draftId, setDraftId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [ocrFile, setOcrFile] = useState(null)
  const voice = useVoiceInput()
  const saveTimerRef = useRef(null)

  const values = watch()

  const loadLatestDraft = useCallback(async () => {
    try {
      const { data } = await http.get('/citizen/fir/draft/latest')
      setDraftId(data.id)
      setStep(data.currentStep || 1)
      setValue('title', data.title || '')
      setValue('description', data.description || '')
      setValue('location', data.location || '')
      setValue('aadhaarNumber', data.aadhaarNumber || '')
      setValue('ocrExtractedText', data.ocrExtractedText || '')
      setValue('ocrKeywords', data.ocrKeywords || '')
      setValue('suggestedCategory', data.suggestedCategory || '')
      setValue('suggestedPriority', data.suggestedPriority || '')
      setMessage({ type: 'info', text: 'Draft loaded. Continue from where you left.' })
    } catch {
      setMessage({ type: 'info', text: 'No existing draft found. You can start a new filing.' })
    }
  }, [setValue])

  useEffect(() => {
    if (resumeSignal > 0) {
      loadLatestDraft()
    }
  }, [loadLatestDraft, resumeSignal])

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(async () => {
      const hasData = Object.values(values).some((value) => String(value || '').trim().length > 0)
      if (!hasData || receipt) return
      const payload = { ...values, currentStep: step }
      try {
        if (!draftId) {
          const { data } = await http.post('/citizen/fir/draft', payload)
          setDraftId(data.id)
        } else {
          await http.patch(`/citizen/fir/draft/${draftId}`, payload)
        }
      } catch {
        // Silent autosave failure to avoid noisy UX.
      }
    }, 1500)
    return () => clearTimeout(saveTimerRef.current)
  }, [values, step, draftId, receipt])

  const validateStep = () => {
    const current = getValues()
    if (step === 1 && (!current.title?.trim() || !current.description?.trim())) {
      setMessage({ type: 'error', text: 'Incident basics are required in step 1.' })
      return false
    }
    if (step === 2 && !current.location?.trim()) {
      setMessage({ type: 'error', text: 'Location is required for routing to station.' })
      return false
    }
    if (step === 4 && !/^\d{12}$/.test(current.aadhaarNumber || '')) {
      setMessage({ type: 'error', text: 'Enter valid 12-digit Aadhaar in step 4.' })
      return false
    }
    return true
  }

  const next = () => {
    if (!validateStep()) return
    setMessage(null)
    setStep((prev) => Math.min(5, prev + 1))
  }

  const back = () => setStep((prev) => Math.max(1, prev - 1))

  const runOcr = async () => {
    if (!ocrFile) {
      setMessage({ type: 'error', text: 'Choose file before running OCR.' })
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', ocrFile)
      const { data } = await http.post('/citizen/ocr/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setValue('ocrExtractedText', data.extractedText || '')
      setValue('ocrKeywords', data.keywords || '')
      setValue('suggestedCategory', data.suggestedCategory || '')
      setValue('suggestedPriority', data.suggestedPriority || '')
      if (data.suggestedTitle) setValue('title', data.suggestedTitle)
      if (data.suggestedDescription) setValue('description', data.suggestedDescription)
      if (data.suggestedLocation) setValue('location', data.suggestedLocation)
      setMessage({ type: 'success', text: 'OCR suggestions applied. You can edit before submit.' })
    } catch (err) {
      setMessage({ type: 'error', text: extractApiError(err, 'OCR failed.') })
    } finally {
      setBusy(false)
    }
  }

  const applyVoice = async () => {
    if (!voice.transcript.trim()) return
    const blob = new Blob([voice.transcript], { type: 'text/plain' })
    const form = new FormData()
    form.append('file', blob, 'voice-input.txt')
    setBusy(true)
    try {
      const { data } = await http.post('/citizen/ocr/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setValue('ocrExtractedText', voice.transcript)
      setValue('ocrKeywords', data.keywords || '')
      if (data.suggestedTitle) setValue('title', data.suggestedTitle)
      if (data.suggestedDescription) setValue('description', data.suggestedDescription)
      if (data.suggestedLocation) setValue('location', data.suggestedLocation)
      setMessage({ type: 'success', text: 'Voice notes analyzed and applied.' })
      voice.stop()
      voice.clear()
    } catch (err) {
      setMessage({ type: 'error', text: extractApiError(err, 'Voice analysis failed.') })
    } finally {
      setBusy(false)
    }
  }

  const submitFir = async () => {
    if (!validateStep()) return
    setBusy(true)
    setMessage(null)
    try {
      const payload = getValues()
      const { data } = await http.post('/citizen/fir', payload)
      setReceipt(data)
      onSubmitted?.()
      setMessage({ type: 'success', text: 'FIR submitted successfully.' })
      reset({
        title: '',
        description: '',
        location: '',
        aadhaarNumber: payload.aadhaarNumber || '',
        ocrExtractedText: '',
        ocrKeywords: '',
        suggestedCategory: '',
        suggestedPriority: '',
      })
      setStep(1)
      setDraftId(null)
    } catch (err) {
      setMessage({ type: 'error', text: extractApiError(err, 'FIR submit failed.') })
    } finally {
      setBusy(false)
    }
  }

  const progressPct = useMemo(() => Math.round((step / 5) * 100), [step])

  return (
    <Panel title="File FIR - Guided Wizard">
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="mb-4 rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-3">
        <div className="flex items-center justify-between text-xs font-semibold text-policeBlue">
          <span>Step {step} of 5</span>
          <span>{progressPct}% completed</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white">
          <div className="h-2 rounded-full bg-policeBlue transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-policeBlue">1. Incident Basics</p>
          <input data-testid="wizard-title" className="input" placeholder="Complaint title" {...register('title', { required: true })} />
          {errors.title && <p className="text-xs text-red-500">Title is required.</p>}
          <textarea data-testid="wizard-description" className="input min-h-24" placeholder="Describe incident in detail" {...register('description', { required: true })} />
          {errors.description && <p className="text-xs text-red-500">Description is required.</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-policeBlue">2. Location and Category Hints</p>
          <input data-testid="wizard-location" className="input" placeholder="Incident location" {...register('location', { required: true })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Suggested category" readOnly {...register('suggestedCategory')} />
            <input className="input" placeholder="Suggested priority" readOnly {...register('suggestedPriority')} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-policeBlue">3. OCR / Voice Assist (Optional)</p>
          <div className="rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-3">
            <input type="file" data-testid="wizard-ocr-file" className="input" aria-label="OCR File Upload" onChange={(event) => setOcrFile(event.target.files?.[0] || null)} />
            <button type="button" data-testid="wizard-ocr-run" className="btn btn-sm btn-primary mt-2" onClick={runOcr} disabled={busy || !ocrFile}>
              {busy ? 'Extracting...' : 'Run OCR Suggestions'}
            </button>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={voice.listening ? voice.stop : voice.start} disabled={!voice.supported}>
                {voice.listening ? 'Stop Recording' : 'Start Recording'}
              </button>
              <button type="button" className="btn btn-sm btn-outline" onClick={applyVoice} disabled={!voice.transcript.trim() || busy}>
                Apply Voice Notes
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={voice.clear}>Clear</button>
            </div>
            {voice.error && <p className="mt-2 text-xs text-red-500">{voice.error}</p>}
            <p className="mt-2 rounded-lg bg-white p-2 text-xs text-slate-600">{voice.transcript || 'Voice transcript will appear here.'}</p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-policeBlue">4. Aadhaar Confirmation</p>
          <input data-testid="wizard-aadhaar" className="input" maxLength={12} placeholder="12-digit Aadhaar" {...register('aadhaarNumber', { required: true })} />
          <p className="text-xs text-slate-500">Your FIR can be submitted only when Aadhaar matches logged-in account.</p>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-policeBlue">5. Review and Submit</p>
          <div className="rounded-xl border border-policeBlue-100 bg-white p-3 text-sm">
            <p><span className="font-semibold">Title:</span> {getValues('title')}</p>
            <p><span className="font-semibold">Location:</span> {getValues('location')}</p>
            <p className="mt-1 whitespace-pre-wrap"><span className="font-semibold">Description:</span> {getValues('description')}</p>
            <p className="mt-2 text-xs text-slate-500">Privacy Notice: Data is encrypted in transit and visible only to authorized roles.</p>
          </div>
        </div>
      )}

      <input type="hidden" {...register('ocrExtractedText')} />
      <input type="hidden" {...register('ocrKeywords')} />
      <input type="hidden" {...register('suggestedCategory')} />
      <input type="hidden" {...register('suggestedPriority')} />

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" data-testid="wizard-back" className="btn btn-outline" disabled={step === 1} onClick={back}>Back</button>
        {step < 5 && <button type="button" data-testid="wizard-next" className="btn btn-primary" onClick={next}>Next</button>}
        {step === 5 && <button type="button" data-testid="wizard-submit" className="btn btn-gold" disabled={busy} onClick={submitFir}>{busy ? 'Submitting...' : 'Submit FIR'}</button>}
      </div>

      {receipt && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-semibold text-green-700">FIR Receipt</p>
          <p>FIR ID: #{receipt.id}</p>
          <p>Timestamp: {new Date(receipt.createdAt).toLocaleString()}</p>
          <p>Station: {receipt.assignedStation || 'Pending assignment'}</p>
          <p>Priority: {receipt.priority}</p>
          <p className="break-all">Digital Signature Hash: {receipt.digitalSignatureHash}</p>
          <p className="mt-2 text-xs text-slate-600">Next steps: Track case in My Cases and add evidence if required.</p>
        </div>
      )}
    </Panel>
  )
}

function CaseList({ firs, loading }) {
  if (loading) return <LoadingSpinner label="Loading cases..." />
  if (!firs.length) return <EmptyState icon="📂" title="No FIRs yet" description="File your first FIR using the guided wizard." />

  return (
    <Panel title="My Cases">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>FIR ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {firs.map((fir) => (
              <tr key={fir.id}>
                <td className="font-mono text-xs">#{fir.id}</td>
                <td>{fir.title}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={fir.status} />
                    {fir.status === 'AWAITING_CITIZEN_ACK' && <span className="text-xs text-amber-700">Action needed</span>}
                  </div>
                </td>
                <td><PriorityBadge priority={fir.priority} /></td>
                <td>
                  <Link className="btn btn-sm btn-outline" to={`/citizen/cases/${fir.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function EvidenceUploader({ firId, onUploaded }) {
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const handleFile = (nextFile) => {
    const error = validateEvidenceFile(nextFile)
    if (error) {
      setMessage({ type: 'error', text: error })
      setFile(null)
      return
    }
    setFile(nextFile)
    setMessage(null)
  }

  const upload = async () => {
    const error = validateEvidenceFile(file)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }
    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    setProgress(0)
    setMessage(null)
    try {
      await http.post(`/citizen/fir/${firId}/evidence`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total) return
          setProgress(Math.round((event.loaded / event.total) * 100))
        },
      })
      setMessage({ type: 'success', text: `Uploaded ${file.name} successfully.` })
      setFile(null)
      onUploaded?.()
    } catch (err) {
      setMessage({ type: 'error', text: extractApiError(err, 'Evidence upload failed.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-4">
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <p className="text-xs text-slate-600">Supported types: JPG, PNG, PDF, TXT, DOC, DOCX, RTF, ODT. Max size: 25 MB.</p>
      <label
        className="flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-policeBlue-200 bg-white p-3 text-center text-sm text-policeBlue hover:border-policeBlue-400"
        onDrop={(event) => {
          event.preventDefault()
          handleFile(event.dataTransfer.files?.[0])
        }}
        onDragOver={(event) => event.preventDefault()}
      >
        <input type="file" data-testid="evidence-file" className="hidden" aria-label="Evidence File Upload" onChange={(event) => handleFile(event.target.files?.[0])} />
        Drag and drop evidence here, or click to choose
      </label>
      {file && (
        <p className="text-xs text-slate-600">
          {file.name} ({Math.round(file.size / 1024)} KB, {file.type || 'unknown'})
        </p>
      )}
      {busy && (
        <div className="h-2 rounded-full bg-white">
          <div className="h-2 rounded-full bg-policeBlue transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <button type="button" data-testid="evidence-upload" className="btn btn-gold" disabled={busy || !file} onClick={upload}>
        {busy ? `Uploading ${progress}%` : 'Upload Evidence'}
      </button>
    </div>
  )
}

function CitizenCaseDetail({ id }) {
  const navigate = useNavigate()
  const [fir, setFir] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await http.get(`/citizen/fir/${id}`)
      setFir(data)
    } catch (err) {
      setError(extractApiError(err, 'Failed to load FIR detail.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const acknowledge = async () => {
    setBusy(true)
    try {
      await http.post(`/citizen/fir/${id}/acknowledge`)
      await load()
    } catch (err) {
      setError(extractApiError(err, 'Failed to acknowledge resolution.'))
    } finally {
      setBusy(false)
    }
  }

  const dispute = async () => {
    if (!disputeReason.trim()) {
      setError('Dispute reason is required.')
      return
    }
    setBusy(true)
    try {
      await http.post(`/citizen/fir/${id}/dispute`, { reason: disputeReason })
      setDisputeReason('')
      await load()
    } catch (err) {
      setError(extractApiError(err, 'Failed to dispute resolution.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading case detail..." />
  if (error && !fir) return <Alert type="error">{error}</Alert>
  if (!fir) return null

  return (
    <div className="space-y-4">
      <button type="button" className="btn btn-outline" onClick={() => navigate('/citizen')}>Back to Citizen Home</button>
      {error && <Alert type="error">{error}</Alert>}

      <Panel title={`Case Detail - FIR #${fir.id}`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={fir.status} />
          <PriorityBadge priority={fir.priority} />
        </div>
        <p className="mt-2 text-sm text-slate-700">{fir.description}</p>
        <p className="mt-2 text-xs text-slate-500">Assigned Station: {fir.assignedStation || 'Pending assignment'}</p>
        <p className="text-xs text-slate-500">Officer: {fir.assignedOfficerName || 'To be assigned'}</p>
        <p className="text-xs text-slate-500 break-all">Digital Signature: {fir.digitalSignatureHash}</p>
        <div className="mt-4">
          <StatusTimeline status={fir.status} />
        </div>
      </Panel>

      {fir.status === 'AWAITING_CITIZEN_ACK' && (
        <Panel title="Resolution Acknowledgement Required">
          <Alert type="info">
            Officer has marked this case as resolved. Please acknowledge resolution or dispute with reason before {fir.acknowledgementDueAt ? new Date(fir.acknowledgementDueAt).toLocaleString() : 'the due date'}.
          </Alert>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" data-testid="acknowledge-resolution" className="btn btn-gold" disabled={busy} onClick={acknowledge}>Acknowledge Resolution</button>
            <button type="button" data-testid="dispute-resolution" className="btn btn-outline" disabled={busy} onClick={dispute}>Dispute Resolution</button>
          </div>
          <textarea
            data-testid="dispute-reason"
            className="input mt-3 min-h-24"
            placeholder="Reason for dispute (required if disputing)"
            value={disputeReason}
            onChange={(event) => setDisputeReason(event.target.value)}
            aria-label="Dispute Reason"
          />
        </Panel>
      )}

      <Panel title="Evidence Upload">
        <EvidenceUploader firId={fir.id} onUploaded={load} />
      </Panel>

      <Panel title="Evidence Files">
        {fir.evidence?.length ? (
          <div className="space-y-2">
            {fir.evidence.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium text-policeBlue">{entry.fileName}</p>
                <p className="text-xs text-slate-500">{entry.fileType} · {Math.round((entry.fileSizeBytes || 0) / 1024)} KB · {entry.uploadedAt ? new Date(entry.uploadedAt).toLocaleString() : '-'}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📎" title="No evidence uploaded yet" description="Upload files above to attach evidence." />
        )}
      </Panel>

      <Panel title="Case Timeline">
        {fir.logs?.length ? (
          <div className="space-y-2">
            {fir.logs.map((log, index) => (
              <div key={`${log.updatedAt}-${index}`} className="rounded-lg border border-policeBlue-100 bg-policeBlue-50 p-3 text-sm">
                <p className="font-medium text-policeBlue">{log.status}</p>
                <p className="text-xs text-slate-500">{log.updatedBy} · {new Date(log.updatedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="🕒" title="No timeline entries yet" description="Status updates will appear here." />
        )}
      </Panel>
    </div>
  )
}

function CitizenMain() {
  const { firs, loading, error, reload } = useFirs()
  const [activeTab, setActiveTab] = useState('home')
  const [resumeSignal, setResumeSignal] = useState(0)

  return (
    <PageTemplate title="Citizen Services" subtitle="Guided filing, evidence workflow, and transparent case tracking">
      <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <AccessibilityControls />

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`btn btn-sm ${activeTab === 'home' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('home')}>Home</button>
        <button type="button" className={`btn btn-sm ${activeTab === 'file' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('file')}>File FIR</button>
        <button type="button" className={`btn btn-sm ${activeTab === 'cases' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('cases')}>My Cases</button>
      </div>

      {activeTab === 'home' && (
        <CitizenHome
          firs={firs}
          onFileAction={() => setActiveTab('file')}
          onCasesAction={() => setActiveTab('cases')}
          onResumeDraft={() => {
            setActiveTab('file')
            setResumeSignal((v) => v + 1)
          }}
        />
      )}

      {activeTab === 'file' && (
        <FirWizard
          onSubmitted={reload}
          resumeSignal={resumeSignal}
        />
      )}

      {activeTab === 'cases' && <CaseList firs={firs} loading={loading} />}
      </div>
    </PageTemplate>
  )
}

export function CitizenDashboard() {
  const { id } = useParams()
  if (id) {
    return <CitizenCaseDetail id={id} />
  }
  return <CitizenMain />
}
