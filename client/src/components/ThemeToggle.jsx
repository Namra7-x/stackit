import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', iconSize = 19 }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`rounded-md text-inkmuted hover:text-ink hover:bg-ink/5 ${className}`}
    >
      {dark ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  );
}
