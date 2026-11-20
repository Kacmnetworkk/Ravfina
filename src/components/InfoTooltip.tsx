import { Info } from 'lucide-react';
import { useId, useState } from 'react';

interface InfoTooltipProps {
  label: string;
  description: string;
}

export function InfoTooltip({ label, description }: InfoTooltipProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const tooltipId = useId();
  const isOpen = pinned || hovered;

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`Configuration help for ${label}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={() => setPinned((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => {
          setHovered(false);
          setPinned(false);
        }}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-[#88888b] dark:hover:bg-[#1d1d1f] dark:hover:text-[#facc15] dark:focus-visible:outline-[#facc15]"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-zinc-800 shadow-xl dark:border-[#2e2e32] dark:bg-[#0d0d0e] dark:text-[#d4d4d8]"
        >
          <span className="block font-medium text-amber-800 dark:text-[#facc15]">{label}</span>
          <span className="mt-0.5 block text-zinc-700 dark:text-[#d4d4d8]">{description}</span>
        </span>
      )}
    </span>
  );
}
