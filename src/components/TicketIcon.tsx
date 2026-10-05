/** Cinema ticket glyph; `filled` = you hold a ticket for tonight. */
export function TicketIcon({ filled, className = '' }: { filled?: boolean; className?: string }) {
  return (
    <svg className={`ticket-ico ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.5 2.5 0 0 0 0-5z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M15 6.5v11" stroke={filled ? 'var(--ticket-cut, var(--bg))' : 'currentColor'} strokeWidth="1.4" strokeDasharray="1.6 1.8" />
    </svg>
  );
}
