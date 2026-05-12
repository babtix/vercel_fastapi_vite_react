/**
 * Toggle button to switch between dark and light themes.
 *
 * Uses the useTheme hook to read the current theme and toggle it.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="bg-transparent border-none cursor-pointer text-[var(--color-text)] flex items-center p-2"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
