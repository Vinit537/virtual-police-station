import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation, LANGUAGES } from '../i18n/LanguageContext'
import { DesignSystemProvider } from './DesignSystem'
import { Icon } from './icons'

const ROLE_NAV = {
  CITIZEN: [
    { to: '/citizen?tab=home', labelKey: 'nav_dashboard', icon: 'shield' },
    { to: '/citizen?tab=file', labelKey: 'nav_services', icon: 'info' },
  ],
  POLICE: [
    { to: '/police?tab=dashboard', labelKey: 'nav_dashboard', icon: 'shield' },
    { to: '/police?tab=case-desk', labelKey: 'nav_case_desk', icon: 'warning' },
  ],
  ADMIN: [
    { to: '/admin?tab=dashboard', labelKey: 'nav_dashboard', icon: 'shield' },
    { to: '/admin?tab=control-room', labelKey: 'nav_control_room', icon: 'info' },
  ],
}

const ROLE_BADGE = {
  CITIZEN: { labelKey: 'role_citizen', cls: 'bg-policeBlue-100 text-policeBlue-700' },
  POLICE: { labelKey: 'role_officer', cls: 'bg-policeGold-100 text-policeGold-700' },
  ADMIN: { labelKey: 'role_admin', cls: 'bg-green-100 text-green-700' },
}

export function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isAuthPage = !user && (location.pathname === '/login' || location.pathname === '/register')

  return (
    <DesignSystemProvider role={user?.role}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="app-shell flex min-h-screen flex-col">
        <Navbar user={user} logout={logout} location={location} />
        <div className={`mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8 ${user ? 'grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr] lg:items-start' : ''}`}>
          {user && <Sidebar user={user} location={location} />}
          <main id="main-content" tabIndex={-1} role="main" className={isAuthPage ? 'flex min-h-[calc(100vh-160px)] items-center justify-center' : ''}>
            {children}
          </main>
        </div>
        {!user && <Footer />}
      </div>
    </DesignSystemProvider>
  )
}

function Navbar({ user, logout, location }) {
  const isActive = (path) => location.pathname === path
  const { lang, setLang, t } = useTranslation()
  const { refreshProfile } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileError, setProfileError] = useState('')
  const profileRef = useRef(null)

  useEffect(() => {
    if (!profileOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [profileOpen])

  const openProfile = async () => {
    setProfileOpen((value) => !value)
    setProfileError('')
    try {
      await refreshProfile()
    } catch {
      setProfileError('Unable to refresh profile details.')
    }
  }

  const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-')

  return (
    <header className="sticky top-0 z-50 border-b border-blue-900/40 shadow-float" style={{ background: 'linear-gradient(135deg, #0D1947 0%, #1F3A93 50%, #2D52C4 100%)' }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-90">
          <span className="text-policeGold"><Icon name="shield" size={28} /></span>
          <div>
            <p className="font-heading text-base font-700 leading-tight tracking-tight">{t('brand_title')}</p>
            <p className="text-[10px] font-medium uppercase leading-none tracking-widest text-policeGold-300">{t('brand_subtitle')}</p>
          </div>
        </Link>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="cursor-pointer rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-policeGold" aria-label={t('language_select')}>
          {LANGUAGES.map((language) => <option key={language.code} value={language.code} className="text-slate-900">{language.native}</option>)}
        </select>
        {user ? (
          <div className="relative flex items-center gap-3" ref={profileRef}>
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold text-white">{user.name}</span>
              <span className="text-xs font-medium text-policeGold-300">{ROLE_BADGE[user.role]?.labelKey ? t(ROLE_BADGE[user.role].labelKey) : user.role}</span>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-policeGold text-sm font-bold text-policeBlue-900 shadow-gold-glow transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Open profile"
              aria-expanded={profileOpen}
              onClick={openProfile}
            >
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-policeBlue-100 bg-white p-4 text-slate-700 shadow-panel">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-policeBlue text-base font-bold text-white">
                    {user.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-heading text-base font-semibold text-policeBlue">{user.name || '-'}</p>
                    <p className="text-xs font-medium text-slate-500">{ROLE_BADGE[user.role]?.labelKey ? t(ROLE_BADGE[user.role].labelKey) : user.role}</p>
                  </div>
                </div>
                {profileError && <p className="mb-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600">{profileError}</p>}
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">Full Name</dt>
                    <dd className="break-words text-policeBlue">{user.name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">Email</dt>
                    <dd className="break-words text-policeBlue">{user.email || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">Aadhaar Number</dt>
                    <dd className="font-mono text-policeBlue">{user.aadhaarNumber || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">Registered At</dt>
                    <dd className="text-policeBlue">{formatDate(user.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            )}
            <button onClick={logout} className="btn btn-sm border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="Logout">
              <Icon name="logout" size={16} />
              <span className="hidden sm:inline">{t('nav_logout')}</span>
            </button>
          </div>
        ) : (
          <nav className="flex items-center gap-2">
            <Link to="/login" className={`btn btn-sm transition-all ${isActive('/login') ? 'bg-white text-policeBlue shadow-md' : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'}`}>{t('nav_login')}</Link>
            <Link to="/register" className={`btn btn-sm btn-gold transition-all ${isActive('/register') ? 'shadow-gold-glow' : ''}`}>{t('nav_register')}</Link>
          </nav>
        )}
      </div>
    </header>
  )
}

function Sidebar({ user, location }) {
  const links = ROLE_NAV[user.role] ?? []
  const roleBadge = ROLE_BADGE[user.role] ?? { labelKey: null, cls: 'bg-slate-100 text-slate-600' }
  const { t } = useTranslation()
  const isLinkActive = (to) => {
    const [path, query = ''] = to.split('?')
    if (location.pathname !== path) return false
    if (!query) return true
    return location.search.replace(/^\?/, '') === query
  }
  return (
    <aside className="sticky top-20 h-fit animate-slide-in rounded-2xl border border-policeBlue-50 bg-white p-4 shadow-panel">
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-policeBlue-50 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-hero-gradient text-sm font-bold text-policeGold shadow">{user.name?.[0]?.toUpperCase() ?? 'U'}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-policeBlue">{user.name}</p>
          <span className={`badge text-[10px] ${roleBadge.cls}`}>{roleBadge.labelKey ? t(roleBadge.labelKey) : user.role}</span>
        </div>
      </div>
      <div className="divider" />
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('sidebar_navigation')}</p>
      <nav className="space-y-1" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.to + link.labelKey} to={link.to} className={`nav-link ${isLinkActive(link.to) ? 'active' : ''}`}>
            <span aria-hidden><Icon name={link.icon} size={16} /></span>
            <span>{t(link.labelKey)}</span>
          </Link>
        ))}
      </nav>
      <div className="divider" />
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
        <span className="h-2 w-2 animate-pulse-slow rounded-full bg-ok" />
        <span className="text-xs font-medium text-ok">{t('sidebar_online')}</span>
      </div>
    </aside>
  )
}

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-auto border-t border-policeBlue-100 bg-white/60 py-6 text-center text-xs text-slate-500">
      <p className="font-medium text-policeBlue">{t('app_title')}</p>
      <p className="mt-1">{t('app_subtitle')}</p>
    </footer>
  )
}
