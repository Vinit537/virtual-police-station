import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import { CitizenDashboard } from './CitizenDashboard'

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

vi.mock('../api/hooks', async () => {
  const actual = await vi.importActual('../api/hooks')
  return {
    ...actual,
    useFirs: () => ({ firs: [], loading: false, error: '', reload: vi.fn() }),
  }
})

function renderCitizen(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LanguageProvider>
        <Routes>
          <Route path="/citizen" element={<CitizenDashboard />} />
          <Route path="/citizen/cases/:id" element={<CitizenDashboard />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('CitizenDashboard V2', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPatch.mockReset()
  })

  it('applies OCR suggestions inside FIR wizard', async () => {
    mockPost.mockImplementation((url) => {
      if (url === '/citizen/ocr/extract') {
        return Promise.resolve({
          data: {
            extractedText: 'Fraud complaint text',
            keywords: 'fraud, cyber',
            suggestedCategory: 'CYBERCRIME',
            suggestedPriority: 'HIGH',
            suggestedTitle: 'Fraud complaint',
            suggestedDescription: 'Fraud complaint text',
            suggestedLocation: 'Indore',
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    renderCitizen('/citizen')

    fireEvent.click(screen.getByRole('button', { name: 'File FIR' }))
    fireEvent.change(screen.getByPlaceholderText('Complaint title'), { target: { value: 'Old title' } })
    fireEvent.change(screen.getByPlaceholderText('Describe incident in detail'), { target: { value: 'Old description' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.change(screen.getByTestId('wizard-location-state'), { target: { value: 'Madhya Pradesh' } })
    fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'Indore' } })
    fireEvent.change(screen.getByPlaceholderText('Specific area'), { target: { value: 'Old location' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const fileInput = screen.getByLabelText('OCR File Upload')
    const file = new File(['test'], 'complaint.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Run OCR Suggestions' }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/citizen/ocr/extract',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByPlaceholderText('Specific area')).toHaveValue('Indore')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByPlaceholderText('Complaint title')).toHaveValue('Fraud complaint')
    expect(screen.getByPlaceholderText('Describe incident in detail')).toHaveValue('Fraud complaint text')
  })

  it('submits dispute reason from case detail acknowledgement panel', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 7,
        title: 'Case 7',
        description: 'Description',
        status: 'AWAITING_CITIZEN_ACK',
        priority: 'HIGH',
        assignedStation: 'Vijay Nagar PS',
        digitalSignatureHash: 'hash',
        evidence: [],
        logs: [],
      },
    })
    mockPost.mockResolvedValue({ data: {} })

    renderCitizen('/citizen/cases/7')

    await screen.findByText('Case Detail - FIR #7')

    fireEvent.change(screen.getByLabelText('Dispute Reason'), { target: { value: 'Investigation incomplete' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dispute Resolution' }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/citizen/fir/7/dispute', { reason: 'Investigation incomplete' })
    })
  })
})
