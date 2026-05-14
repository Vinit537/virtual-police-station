import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n/LanguageContext'
import { LoginPage } from './LoginPage'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}))

describe('LoginPage', () => {
  it('renders login form fields', () => {
    render(
      <LanguageProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </LanguageProvider>,
    )

    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('officer@police.gov.in')).toBeInTheDocument()
  })
})
