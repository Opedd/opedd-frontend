import { useState, type ReactNode } from 'react';

// Phase 6.5 — Reusable "Where do I find this?" expandable hint.
//
// Independent open/closed state per instance — Step2Beehiiv has two
// (one per field) and per founder OQ-2 routing they expand
// independently (no auto-collapse coupling).
//
// Accessible disclosure pattern: button with aria-expanded + a content
// region revealed below. Keyboard Enter/Space activates via native
// button semantics.
//
// LOVABLE-POLISH (Phase 10): no animation; instant show/hide. Could
// add height transition + fade later. Functional first.

interface HelperExpandableProps {
  /** Visible label on the trigger button (e.g., "Where do I find this?"). */
  label: string;
  /** Content shown when expanded. Caller renders own markup (paragraphs,
   *  lists, code blocks) — this component only manages the toggle. */
  children: ReactNode;
  /** Optional id for accessibility wiring (input's aria-describedby). */
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
