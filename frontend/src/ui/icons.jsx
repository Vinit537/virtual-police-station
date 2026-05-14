export function Icon({ name, size = 20, className = '' }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', className, 'aria-hidden': true }
  switch (name) {
    case 'shield':
      return <svg {...props}><path d="M12 2 4 5v6c0 5.25 3.4 10.15 8 11.35C16.6 21.15 20 16.25 20 11V5l-8-3Z" fill="currentColor" /><path d="m8 11 3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'logout':
      return <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="m16 17 5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'check':
      return <svg {...props}><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'info':
      return <svg {...props}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 16v-5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    case 'warning':
      return <svg {...props}><path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="2" /><path d="M12 9v5M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    default:
      return <svg {...props}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /></svg>
  }
}
