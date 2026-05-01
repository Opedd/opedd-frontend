import { Users, ExternalLink } from "lucide-react";

// Phase 5.3-attribution OQ-5: action-oriented empty state with one
// short pointer at the discovery rail (RSL declaration). No
// marketplace promotion (per C.3 — Opedd is infrastructure, not a
// marketplace). Two sentences max per UX happy-path discipline.

interface Props {
  publisherId: string;
}

export function LicenseesEmptyState({ publisherId }: Props) {
  const rslUrl = `https://api.opedd.com/rsl-manifest?publisher_id=${publisherId}`;
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
        <Users size={20} className="text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-900">No licensees yet</p>
      <p className="text-xs text-gray-500 mt-1 max-w-xs">
        Your content is discoverable via your public RSL declaration.
      </p>
      <a
        href={rslUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-oxford hover:underline"
      >
        View your RSL declaration <ExternalLink size={11} />
      </a>
    </div>
  );
}
