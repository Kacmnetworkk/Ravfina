import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleButtonProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggleButton({
  compact = false,
  className = '',
}: ThemeToggleButtonProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={!isDark}
      aria-label={
        isDark ? 'Switch to high-contrast light theme' : 'Switch to dark theme'
      }
      title={
        isDark ? 'Switch to high-contrast light theme' : 'Switch to dark theme'
      }
      data-testid="theme-toggle-button"
      data-theme-mode={theme}
      className={`ravfina-interactive-btn ravfina-focus-ring inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-semibold text-zinc-900 hover:border-zinc-500 hover:bg-zinc-100 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-[#d4d4d8] dark:hover:border-[#2e2e32] dark:hover:bg-[#1d1d1f] dark:hover:text-white whitespace-nowrap shrink-0 ${
        compact ? 'min-h-[32px] px-2.5 py-1' : 'min-h-[36px] px-3 py-1.5'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-[#facc15] shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-zinc-900 shrink-0" aria-hidden="true" />
      )}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
