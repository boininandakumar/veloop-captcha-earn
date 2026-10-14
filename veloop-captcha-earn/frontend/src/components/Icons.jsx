const base = { width: "1em", height: "1em", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const BackIcon = (p) => (<svg {...base} {...p}><path d="M15 18l-6-6 6-6" /></svg>);
export const RefreshIcon = (p) => (<svg {...base} {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>);
export const ShieldIcon = (p) => (<svg {...base} {...p}><path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>);
export const LockIcon = (p) => (<svg {...base} {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="16" r="1.2" fill="currentColor" /></svg>);
export const CheckIcon = (p) => (<svg {...base} strokeWidth={3} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
export const CrossIcon = (p) => (<svg {...base} strokeWidth={3} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>);

export function GemIcon({ size = "1em" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="gemG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M6 3h12l4 6-10 12L2 9l4-6z" fill="url(#gemG)" />
      <path d="M2 9h20M9 3l-3 6 6 12 6-12-3-6" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}