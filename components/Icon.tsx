import type { EvaluationStatus, Verdict } from '../utils/types';

type Props = { size?: number };

export function StatusIcon({ status, size = 22 }: Props & { status: EvaluationStatus }) {
  if (status === 'met') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Met">
        <defs>
          <linearGradient id="ycaMet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#ycaMet)" />
        <path
          d="M7 12.5l3.2 3.2L17 9"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === 'not_met') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Not met">
        <defs>
          <linearGradient id="ycaNot" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#ycaNot)" />
        <path
          d="M8 8l8 8M16 8l-8 8"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Unknown">
      <defs>
        <linearGradient id="ycaUnk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#ycaUnk)" />
      <path
        d="M9.2 9.4c.2-1.5 1.4-2.6 2.9-2.6 1.6 0 2.9 1.2 2.9 2.8 0 1.5-1.1 2.1-1.9 2.6-.7.5-1 1-1 1.7v.3"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="12.05" cy="17.2" r="1.2" fill="#fff" />
    </svg>
  );
}

export function VerdictBadge({ verdict, score }: { verdict: Verdict; score: number }) {
  const cfg = {
    worth_it: { label: 'Worth it', from: '#10b981', to: '#059669' },
    maybe: { label: 'Maybe', from: '#f59e0b', to: '#d97706' },
    skip: { label: 'Skip', from: '#ef4444', to: '#b91c1c' },
  }[verdict];
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})`,
        color: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.3 }}>{cfg.label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {score}
        <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 2 }}>/100</span>
      </div>
    </div>
  );
}

export function SparkIcon({ size = 18 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2l1.8 5.8L19.5 9.5l-5.7 1.8L12 17l-1.8-5.7L4.5 9.5l5.7-1.7L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function CopyIcon({ size = 14 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path
        d="M16 8H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon({ size = 16, dir = 'down' }: Props & { dir?: 'up' | 'down' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: dir === 'up' ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
