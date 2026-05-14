import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n/LanguageContext'
import { RegisterPage } from './RegisterPage'

const mockRegister = vi.fn()
const mockPost = vi.fn()

vi.mock('../api/http', () => ({
  http: {
    post: (...args) => mockPost(...args),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ register: (...args) => mockRegister(...args) }),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockPost.mockReset()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'en'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    })
  })

  it('shows backend validation error message on failed registration', async () => {
    mockPost.mockImplementation((url) => {
      if (url === '/auth/otp/generate') return Promise.resolve({ data: { debugOtp: '123456' } })
      if (url === '/auth/otp/verify') return Promise.resolve({ data: { verified: true } })
      return Promise.resolve({ data: {} })
    })

    mockRegister.mockRejectedValue({
      response: {
        data: {
          error: 'Email already exists',
        },
      },
    })

    render(
      <LanguageProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </LanguageProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('Rajesh Kumar'), { target: { value: 'Already User' } })
    fireEvent.change(screen.getByPlaceholderText('rajesh@example.com'), { target: { value: 'already@test.com' } })
    fireEvent.change(document.getElementById('reg-password'), { target: { value: 'Password@123' } })

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('XXXX XXXX XXXX')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('XXXX XXXX XXXX'), { target: { value: '123456789012' } })
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await waitFor(() => expect(screen.getByText(/debug otp/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('6-digit OTP'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))
    await waitFor(() => expect(screen.getByText('Aadhaar verified successfully')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText('Review')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockRegister).toHaveBeenCalled())

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })

  it('does not submit registration from step 2 after Aadhaar verification', async () => {
    mockPost.mockImplementation((url) => {
      if (url === '/auth/otp/generate') return Promise.resolve({ data: { debugOtp: '123456' } })
      if (url === '/auth/otp/verify') return Promise.resolve({ data: { verified: true } })
      return Promise.resolve({ data: {} })
    })

    render(
      <LanguageProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </LanguageProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('Rajesh Kumar'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByPlaceholderText('rajesh@example.com'), { target: { value: 'test@example.com' } })
    fireEvent.change(document.getElementById('reg-password'), { target: { value: 'Password@123' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('XXXX XXXX XXXX')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('XXXX XXXX XXXX'), { target: { value: '123456789012' } })
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await waitFor(() => expect(screen.getByText(/debug otp/i)).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('6-digit OTP'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))

    await waitFor(() => {
      expect(screen.getByText('Aadhaar verified successfully')).toBeInTheDocument()
    })

    fireEvent.keyDown(screen.getByPlaceholderText('6-digit OTP'), { key: 'Enter', code: 'Enter' })

    expect(mockRegister).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('XXXX XXXX XXXX')).toBeInTheDocument()
    expect(screen.queryByText('Review')).not.toBeInTheDocument()
  })
})
