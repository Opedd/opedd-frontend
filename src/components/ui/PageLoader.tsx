import opeddIcon from "@/assets/opedd-icon.svg";

export function PageLoader({ showText = false }: { showText?: boolean }) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-20 h-20">
          <svg className="absolute inset-0 w-20 h-20 animate-spin" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#040042" strokeOpacity="0.1" strokeWidth="4" />
            <circle cx="40" cy="40" r="36" fill="none" stroke="#040042" strokeWidth="4" strokeLinecap="round" strokeDasharray="56 170" strokeDashoffset="0" />
          </svg>
          <img
            src={opeddIcon}
            alt="Opedd"
            className="absolute inset-0 w-10 h-10 m-auto object-contain"
          />
        </div>
        {showText && (
          <p className="text-sm font-medium text-muted-foreground tracking-wide">Loading…</p>
        )}
      </div>
    </div>
  );
}
