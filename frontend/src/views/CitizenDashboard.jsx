import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { http } from '../api/http'
import { extractApiError, useFirs } from '../api/hooks'
import { useAuth } from '../context/AuthContext'
import { Panel, StatCard, LoadingSpinner, EmptyState } from '../ui/Cards'
import { Alert, PriorityBadge, StatusBadge, StatusTimeline } from '../ui/Shared'
import { PageTemplate } from '../ui/DesignSystem'

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const MAX_FILE_BYTES = 25 * 1024 * 1024
const ACCEPTED_EVIDENCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'txt', 'doc', 'docx', 'rtf', 'odt', 'mp3', 'wav', 'm4a', 'mp4', 'webm', 'mov']
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

function useVoiceInput() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [permissionGranted, setPermissionGranted] = useState(false)
  const recognitionRef = useRef(null)
  const shouldContinueRef = useRef(false)

  const start = async () => {
    if (listening) return
    setError('')
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.')
      return
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setError('Voice recording requires a secure context (HTTPS or localhost).')
      return
    }
    try {
      // Try explicit mic permission first, but do not block recognition start if this check fails.
      const canRequestMic = typeof navigator !== 'undefined'
        && navigator.mediaDevices
        && typeof navigator.mediaDevices.getUserMedia === 'function'
      if (canRequestMic) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        setPermissionGranted(true)
      } else {
        setPermissionGranted(false)
      }
    } catch {
      // Some Chrome setups can still start Web Speech after this fails; let recognition decide.
      setPermissionGranted(false)
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new RecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = 'en-IN'
    recognition.onstart = () => {
      shouldContinueRef.current = true
      setListening(true)
    }
    recognition.onend = () => {
      if (shouldContinueRef.current) {
        try {
          recognition.start()
          return
        } catch {
          // Ignore restart race and fall through to stopped state.
        }
      }
      setListening(false)
    }
    recognition.onerror = (event) => {
      const code = event?.error || 'unknown'
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Microphone access blocked by browser settings. Enable it for localhost and retry.')
      } else if (code === 'no-speech') {
        setError('No speech detected. Speak clearly and keep the mic close.')
      } else {
        setError(`Voice error: ${code}`)
      }
    }
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const segment = `${event.results[index][0].transcript} `
        if (event.results[index].isFinal) finalText += segment
        else interimText += segment
      }
      setTranscript((prev) => `${prev} ${finalText}${interimText}`.trim())
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (err) {
      setListening(false)
      setError(err?.message || 'Unable to start voice recording.')
    }
  }

  const stop = () => {
    shouldContinueRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current?.abort()
    setListening(false)
  }
  const clear = () => {
    setTranscript('')
    setError('')
  }

  return { listening, transcript, error, supported: !!SpeechRecognition, permissionGranted, start, stop, clear }
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

function CitizenHome({ firs, onFileAction, onEvidenceAction, onPendingAckAction }) {
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
          <button type="button" data-testid="citizen-upload-evidence" onClick={onEvidenceAction} className="rounded-xl border border-policeBlue-100 bg-white p-4 text-left hover:bg-slate-50">
            <p className="font-semibold text-policeBlue">Uploaded Evidence</p>
            <p className="mt-1 text-xs text-slate-600">Attach files from case details.</p>
          </button>
          <button type="button" data-testid="citizen-pending-ack" onClick={onPendingAckAction} className="rounded-xl border border-policeBlue-100 bg-amber-50 p-4 text-left hover:bg-amber-100">
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

function FirWizard({ onSubmitted, resumeSignal, registeredAadhaar }) {
  const totalSteps = 4
  const { register, setValue, getValues, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      location: '',
      locationState: '',
      locationCity: '',
      locationArea: '',
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

  const buildFirPayload = useCallback((sourceValues) => ({
    title: sourceValues.title || null,
    description: sourceValues.description || null,
    location: sourceValues.location || null,
    aadhaarNumber: String(registeredAadhaar || sourceValues.aadhaarNumber || '').trim() || null,
    ocrExtractedText: sourceValues.ocrExtractedText || null,
    ocrKeywords: sourceValues.ocrKeywords || null,
    suggestedCategory: sourceValues.suggestedCategory || null,
    suggestedPriority: sourceValues.suggestedPriority || null,
  }), [registeredAadhaar])

  const loadLatestDraft = useCallback(async () => {
    try {
      const { data } = await http.get('/citizen/fir/draft/latest')
      setDraftId(data.id)
      setStep(data.currentStep || 1)
      setValue('title', data.title || '')
      setValue('description', data.description || '')
      setValue('location', data.location || '')
      setValue('locationState', data.locationState || '')
      setValue('locationCity', data.locationCity || '')
      setValue('locationArea', data.locationArea || data.location || '')
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
    const composedLocation = [values.locationState, values.locationCity, values.locationArea]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ')
    setValue('location', composedLocation)
  }, [values.locationState, values.locationCity, values.locationArea, setValue])

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(async () => {
      const hasData = Object.values(values).some((value) => String(value || '').trim().length > 0)
      if (!hasData || receipt) return
      const payload = { ...buildFirPayload(values), currentStep: step }
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
  }, [values, step, draftId, receipt, buildFirPayload])

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
    const linkedAadhaar = String(registeredAadhaar || current.aadhaarNumber || '').trim()
    if (step === totalSteps && !/^\d{12}$/.test(linkedAadhaar)) {
      setMessage({ type: 'error', text: 'Registered Aadhaar not available. Please logout and login again.' })
      return false
    }
    return true
  }

  const next = () => {
    if (!validateStep()) return
    setMessage(null)
    setStep((prev) => Math.min(totalSteps, prev + 1))
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
      if (data.suggestedLocation) {
        setValue('location', data.suggestedLocation)
        setValue('locationArea', data.suggestedLocation)
      }
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
      if (data.suggestedLocation) {
        setValue('location', data.suggestedLocation)
        setValue('locationArea', data.suggestedLocation)
      }
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
      const payload = buildFirPayload(getValues())
      const { data } = await http.post('/citizen/fir', payload)
      setReceipt(data)
      onSubmitted?.()
      setMessage({ type: 'success', text: 'FIR submitted successfully.' })
      reset({
        title: '',
        description: '',
        location: '',
        locationState: '',
        locationCity: '',
        locationArea: '',
        aadhaarNumber: registeredAadhaar || payload.aadhaarNumber || '',
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

  const progressPct = useMemo(() => Math.round((step / totalSteps) * 100), [step, totalSteps])

  return (
    <Panel title="File FIR - Guided Wizard">
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="mb-4 rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-3">
        <div className="flex items-center justify-between text-xs font-semibold text-policeBlue">
          <span>Step {step} of {totalSteps}</span>
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
          <select data-testid="wizard-location-state" className="input" defaultValue="" {...register('locationState', { required: true })}>
            <option value="" disabled>Select State</option>
            {INDIAN_STATES.map((stateName) => (
              <option key={stateName} value={stateName}>{stateName}</option>
            ))}
          </select>
          <input data-testid="wizard-location-city" className="input" placeholder="City" {...register('locationCity', { required: true })} />
          <input data-testid="wizard-location-area" className="input" placeholder="Specific area" {...register('locationArea', { required: true })} />
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
            {!voice.error && !voice.permissionGranted && (
              <p className="mt-2 text-xs text-slate-600">Click Start Recording and allow microphone access when prompted.</p>
            )}
            <p className="mt-2 rounded-lg bg-white p-2 text-xs text-slate-600">{voice.transcript || 'Voice transcript will appear here.'}</p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-policeBlue">4. Review and Submit</p>
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
        {step < totalSteps && <button type="button" data-testid="wizard-next" className="btn btn-primary" onClick={next}>Next</button>}
        {step === totalSteps && <button type="button" data-testid="wizard-submit" className="btn btn-gold" disabled={busy} onClick={submitFir}>{busy ? 'Submitting...' : 'Submit FIR'}</button>}
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

function CaseList({ firs, loading, onlyPendingAck = false }) {
  if (loading) return <LoadingSpinner label="Loading cases..." />
  const items = onlyPendingAck ? firs.filter((fir) => fir.status === 'AWAITING_CITIZEN_ACK') : firs
  if (!items.length) {
    if (onlyPendingAck) return <EmptyState icon="WAIT" title="No pending acknowledgements" description="You have no cases awaiting acknowledgement right now." />
    return <EmptyState icon="📂" title="No FIRs yet" description="File your first FIR using the guided wizard." />
  }

  return (
    <Panel title={onlyPendingAck ? 'Pending Acknowledgement Cases' : 'My Cases'}>
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
            {items.map((fir) => (
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

function UploadedEvidenceList({ firs, loading }) {
  const [preview, setPreview] = useState(null)
  const [openError, setOpenError] = useState('')

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  if (loading) return <LoadingSpinner label="Loading uploaded evidence..." />
  if (!firs.length) return <EmptyState icon="FIR" title="No FIRs yet" description="Submit your first FIR to upload evidence." />

  const ordered = [...firs].sort((a, b) => (a.id || 0) - (b.id || 0))
  const openEvidence = async (evidenceId, fileName, fileType) => {
    setOpenError('')
    try {
      const response = await http.get(`/citizen/evidence/${evidenceId}/download`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: fileType || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const type = (fileType || '').toLowerCase()
      if (preview?.url) URL.revokeObjectURL(preview.url)
      if (type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/') || type === 'application/pdf' || type === 'text/plain') {
        setPreview({ url, type, fileName: fileName || `evidence-${evidenceId}` })
      } else {
        setPreview(null)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName || `evidence-${evidenceId}`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch {
      setOpenError('Unable to open this evidence file right now. Please retry after backend restart.')
    }
  }

  return (
    <Panel title="Uploaded Evidence">
      {openError && <Alert type="error">{openError}</Alert>}
      {preview && (
        <div className="mb-3 rounded-xl border border-policeBlue-100 bg-policeBlue-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-policeBlue">Preview: {preview.fileName}</p>
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={() => {
                URL.revokeObjectURL(preview.url)
                setPreview(null)
              }}
            >
              Close Preview
            </button>
          </div>
          <div className="mt-2 rounded-lg bg-white p-2">
            {preview.type.startsWith('image/') && <img src={preview.url} alt={preview.fileName} className="max-h-80 rounded-lg object-contain" />}
            {preview.type.startsWith('audio/') && <audio controls src={preview.url} className="w-full" />}
            {preview.type.startsWith('video/') && <video controls src={preview.url} className="max-h-80 w-full rounded-lg" />}
            {preview.type === 'application/pdf' && <iframe title={preview.fileName} src={preview.url} className="h-96 w-full rounded-lg border border-slate-200" />}
            {preview.type === 'text/plain' && <iframe title={preview.fileName} src={preview.url} className="h-72 w-full rounded-lg border border-slate-200" />}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {ordered.map((fir) => (
          <div key={fir.id} className="rounded-xl border border-policeBlue-100 bg-white p-3">
            <p className="text-sm font-semibold text-policeBlue">FIR #{fir.id} - {fir.title || 'Untitled Case'}</p>
            <p className="mt-1 text-xs text-slate-500">Status: {fir.status}</p>
            {fir.evidence?.length ? (
              <div className="mt-2 space-y-2">
                {fir.evidence.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-policeBlue">{ev.fileName}</p>
                        <p className="text-slate-600">
                          {ev.fileType} | {Math.round((ev.fileSizeBytes || 0) / 1024)} KB | {ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleString() : '-'}
                        </p>
                      </div>
                      <button type="button" className="btn btn-xs btn-outline" onClick={() => openEvidence(ev.id, ev.fileName, ev.fileType)}>
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">No evidence uploaded for this FIR.</p>
            )}
          </div>
        ))}
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
  const auth = useAuth()
  const user = auth?.user || null
  const { firs, loading, error, reload } = useFirs()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('home')
  const [resumeSignal, setResumeSignal] = useState(0)
  const [onlyPendingAck, setOnlyPendingAck] = useState(false)
  const [evidenceFirs, setEvidenceFirs] = useState([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const tabParam = searchParams.get('tab')

  useEffect(() => {
    const nextTab = tabParam === 'file' || tabParam === 'cases' || tabParam === 'evidence' ? tabParam : 'home'
    if (nextTab !== activeTab) setActiveTab(nextTab)
  }, [tabParam, activeTab])

  const switchTab = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
    if (tab !== 'cases') setOnlyPendingAck(false)
  }

  useEffect(() => {
    const loadEvidenceDetails = async () => {
      if (activeTab !== 'evidence' || !firs.length) return
      setEvidenceLoading(true)
      try {
        const details = await Promise.all(
          [...firs]
            .sort((a, b) => (a.id || 0) - (b.id || 0))
            .map(async (fir) => {
              try {
                const { data } = await http.get(`/citizen/fir/${fir.id}`)
                return data
              } catch {
                return fir
              }
            }),
        )
        setEvidenceFirs(details)
      } finally {
        setEvidenceLoading(false)
      }
    }
    loadEvidenceDetails()
  }, [activeTab, firs])

  return (
    <PageTemplate title="Citizen Services" subtitle="Guided filing, evidence workflow, and transparent case tracking">
      <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`btn btn-sm ${activeTab === 'home' ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchTab('home')}>Home</button>
        <button type="button" className={`btn btn-sm ${activeTab === 'file' ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchTab('file')}>File FIR</button>
        <button type="button" className={`btn btn-sm ${activeTab === 'cases' ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchTab('cases')}>My Cases</button>
        <button type="button" className={`btn btn-sm ${activeTab === 'evidence' ? 'btn-primary' : 'btn-outline'}`} onClick={() => switchTab('evidence')}>Uploaded Evidence</button>
      </div>

      {activeTab === 'home' && (
        <CitizenHome
          firs={firs}
          onFileAction={() => switchTab('file')}
          onEvidenceAction={() => switchTab('evidence')}
          onPendingAckAction={() => {
            setOnlyPendingAck(true)
            switchTab('cases')
          }}
        />
      )}

      {activeTab === 'file' && (
        <FirWizard
          onSubmitted={reload}
          resumeSignal={resumeSignal}
          registeredAadhaar={user?.aadhaarNumber || ''}
        />
      )}

      {activeTab === 'cases' && <CaseList firs={firs} loading={loading} onlyPendingAck={onlyPendingAck} />}
      {activeTab === 'evidence' && <UploadedEvidenceList firs={evidenceFirs.length ? evidenceFirs : firs} loading={loading || evidenceLoading} />}
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

