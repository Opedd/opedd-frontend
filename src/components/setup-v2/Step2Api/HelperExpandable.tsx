import { useState, type ReactNode } from 'react';

// Phase 8.6 — Reusable "Learn more" expandable hint.
//
// Mirrors Step2Ghost/HelperExpandable.tsx (Phase 7.5 ship) — platform-
// agnostic; Step2Api owns its namespace copy. Future cleanup-audit may
// promote to a shared location if a fifth platform onboarding ships.
//
// Independent open/closed state per instance — accessible disclosure
// pattern with aria-expanded + content region.

interface HelperExpandableProps {
  label: string;
  children: ReactNode;
  id?: string;
}

export function HelperExpandable({ label, children, id }: HelperExpandableProps) {
  const [open, setOpen] = useState(false);
  const contentId = id ? `${id}-content` : undefined;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className="text-xs text-gray-500 hover:text-navy-deep underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-navy-deep/20 rounded-sm"
      >
        {label} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div
          id={contentId}
          className="mt-2 rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 leading-relaxed"
        >
          {children}
        </div>
      )}
    </div>
  );
}
