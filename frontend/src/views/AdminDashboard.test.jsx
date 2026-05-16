import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import { AdminDashboard } from './AdminDashboard'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../api/http', () => ({
  http: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
  },
}))

function buildQueueItem(overrides = {}) {
  return {
    id: 2,
    title: 'Case Two',
    description: 'Case details',
    category: 'Safety',
    status: 'DISPUTED_REVIEW',
    priority: 'HIGH',
    assignedStation: 'Central',
    citizenName: 'Citizen X',
    citizenAadhaarMasked: '********1234',
    assignedOfficerName: 'Officer One',
    createdAt: '2026-05-10T09:00:00.000Z',
    acknowledgementDueAt: '2026-05-11T09:00:00.000Z',
    isSlaBreached: false,
    slaBucket: 'DUE_24H',
    requiresAdminAttention: true,
    pendingCitizenAckHours: 10,
    escalatedAt: null,
    escalatedBy: null,
    escalationReason: '',
    escalationDueAt: null,
    lastPoliceActionAt: null,
    lastCitizenActionAt: null,
    lastAdminActionAt: null,
    adminNotePreview: '',
    ...overrides,
  }
}

function buildDetail(id = 2) {
  return {
    fir: {
      id,
      title: 'Case Two',
      description: 'Case details',
      category: 'Safety',
      status: 'DISPUTED_REVIEW',
      priority: 'HIGH',
      location: 'Zone 1',
      assignedStation: 'Central',
      citizenName: 'Citizen X',
      assignedOfficerName: 'Officer One',
      acknowledgementDueAt: '2026-05-11T09:00:00.000Z',
      adminRequestUpdateDueAt: null,
      evidence: [],
      logs: [],
    },
    citizenEmail: 'citizen@example.com',
    citizenAadhaar: '123412341234',
    isSlaBreached: false,
    slaBucket: 'DUE_24H',
    requiresAdminAttention: true,
    pendingCitizenAckHours: 10,
    escalatedAt: null,
    escalatedBy: null,
    escalationReason: '',
    escalationDueAt: null,
    lastPoliceActionAt: null,
    lastCitizenActionAt: null,
    lastAdminActionAt: null,
    adminNotePreview: '',
  }
}

describe('AdminDashboard V2 command centre', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('loads default critical queue and shows workbench for selected case', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/admin/command/queue') return Promise.resolve({ data: [buildQueueItem()] })
      if (url === '/admin/command/fir/2') return Promise.resolve({ data: buildDetail(2) })
      if (url === '/admin/analytics') return Promise.resolve({ data: { stats: { users: 1, officers: 1, firs: 1, activeCases: 1 }, firByCategory: [], firByStatus: [] } })
      if (url === '/admin/events') return Promise.resolve({ data: [] })
      if (url === '/admin/crime-trend') return Promise.resolve({ data: [] })
      if (url === '/admin/officers') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })

    render(
      <MemoryRouter initialEntries={['/admin?tab=control-room']}>
        <LanguageProvider>
          <AdminDashboard />
        </LanguageProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/admin/command/queue', expect.objectContaining({
      params: expect.objectContaining({ preset: 'CRITICAL_ATTENTION' }),
    })))
    await screen.findByTestId('admin-inbox-2')
    await screen.findByText('Admin Workbench #2')
  })

  it('submits priority override intervention', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/admin/command/queue') return Promise.resolve({ data: [buildQueueItem()] })
      if (url === '/admin/command/fir/2') return Promise.resolve({ data: buildDetail(2) })
      if (url === '/admin/analytics') return Promise.resolve({ data: { stats: { users: 1, officers: 1, firs: 1, activeCases: 1 }, firByCategory: [], firByStatus: [] } })
      if (url === '/admin/events') return Promise.resolve({ data: [] })
      if (url === '/admin/crime-trend') return Promise.resolve({ data: [] })
      if (url === '/admin/officers') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    mockPost.mockResolvedValue({ data: buildDetail(2) })

    render(
      <MemoryRouter initialEntries={['/admin?tab=control-room']}>
        <LanguageProvider>
          <AdminDashboard />
        </LanguageProvider>
      </MemoryRouter>,
    )

    await screen.findByText('Admin Workbench #2')
    fireEvent.click(screen.getByRole('button', { name: 'Interventions' }))
    fireEvent.change(screen.getByPlaceholderText('Reason (required)'), { target: { value: 'Urgent risk pattern' } })
    fireEvent.click(screen.getByRole('button', { name: 'Override Priority' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/admin/command/fir/2/priority-override', {
      priority: 'HIGH',
      reason: 'Urgent risk pattern',
    }))
  })
})
