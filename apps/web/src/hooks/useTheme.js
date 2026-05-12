/**
 * Convenience re-export of the ThemeContext hook.
 *
 * Provides access to theme state (dark/light), background effects,
 * primary color, code highlighting theme, font size, and their setters.
 */

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

export function useTheme() {
  return useThemeContext();
}
