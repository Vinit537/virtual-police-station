import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import { PoliceDashboard } from './PoliceDashboard'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()

vi.mock('../api/http', () => ({
  http: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    patch: (...args) => mockPatch(...args),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Officer One', role: 'POLICE' } }),
}))

describe('PoliceDashboard V3', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPatch.mockReset()
  })

  it('defaults to Action Required preset and prioritizes disputed before awaiting ack', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/police/fir/queue') {
        return Promise.resolve({
          data: [
            { id: 1, title: 'Submitted case', description: 'desc', status: 'SUBMITTED', priority: 'HIGH', citizenName: 'Citizen A', evidence: [] },
            { id: 2, title: 'Awaiting case', description: 'desc', status: 'AWAITING_CITIZEN_ACK', priority: 'MEDIUM', citizenName: 'Citizen B', evidence: [], acknowledgementDueAt: '2099-01-01T00:00:00.000Z' },
            { id: 3, title: 'Disputed case', description: 'desc', status: 'DISPUTED_REVIEW', priority: 'CRITICAL', citizenName: 'Citizen C', evidence: [] },
          ],
        })
      }
      if (url === '/police/fir/3') {
        return Promise.resolve({
          data: {
            id: 3,
            title: 'Disputed case',
            description: 'desc',
            status: 'DISPUTED_REVIEW',
            priority: 'CRITICAL',
            citizenName: 'Citizen C',
            evidence: [],
            logs: [],
          },
        })
      }
      if (url === '/police/fir/2') {
        return Promise.resolve({
          data: {
            id: 2,
            title: 'Awaiting case',
            description: 'desc',
            status: 'AWAITING_CITIZEN_ACK',
            priority: 'MEDIUM',
            citizenName: 'Citizen B',
            evidence: [],
            logs: [],
            acknowledgementDueAt: '2099-01-01T00:00:00.000Z',
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter initialEntries={['/police?tab=case-desk']}>
        <LanguageProvider>
          <PoliceDashboard />
        </LanguageProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/police/fir/queue', { params: {} }))
    await screen.findByText(/Case Workbench #3|Case Workbench #2/)

    expect(screen.queryByTestId('police-inbox-1')).not.toBeInTheDocument()
    const rows = [screen.getByTestId('police-inbox-3'), screen.getByTestId('police-inbox-2')]
    expect(rows).toHaveLength(2)

    const firstOpenButton = within(rows[0]).getByRole('button', { name: 'Open' })
    expect(firstOpenButton).toBeInTheDocument()
    expect(within(rows[0]).getByText(/Needs Action/i)).toBeInTheDocument()
  })

  it('shows resolve checklist only for investigating case in Actions tab', async () => {
    mockGet.mockImplementation((url) => {
      if (url === '/police/fir/queue') {
        return Promise.resolve({
          data: [
            {
              id: 8,
              title: 'Case',
              description: 'desc',
              status: 'INVESTIGATING',
              priority: 'HIGH',
              citizenName: 'Citizen',
              evidence: [],
            },
          ],
        })
      }
      if (url === '/police/fir/8') {
        return Promise.resolve({
          data: {
            id: 8,
            title: 'Case',
            description: 'desc',
            status: 'INVESTIGATING',
            priority: 'HIGH',
            citizenName: 'Citizen',
            evidence: [],
            logs: [],
          },
        })
      }
      return Promise.resolve({ data: {} })
    })
    mockPost.mockResolvedValue({ data: {} })

    render(
      <MemoryRouter initialEntries={['/police?tab=case-desk']}>
        <LanguageProvider>
          <PoliceDashboard />
        </LanguageProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'All Open' }))
    await waitFor(() => expect(screen.getByTestId('police-inbox-8')).toBeInTheDocument())
    await screen.findByText('Case Workbench #8')
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))

    await screen.findByText('Resolve Checklist (Mandatory)')
    const resolveButton = screen.getByRole('button', { name: 'Mark Resolved and Send for Citizen Ack' })
    expect(resolveButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Internal Closure Note'), { target: { value: 'Internal note' } })
    fireEvent.change(screen.getByLabelText('Citizen-facing Closure Summary'), { target: { value: 'Citizen summary' } })
    fireEvent.click(screen.getByLabelText(/I confirm latest evidence has been reviewed/i))
    expect(resolveButton).not.toBeDisabled()
  })
})
