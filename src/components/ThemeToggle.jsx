import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { resolvedTheme, setTheme } = useTheme();
  
  const isDark = resolvedTheme === 'dark';

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative inline-flex h-6 w-11 min-w-[44px] max-w-[44px] flex-shrink-0 items-center rounded-full
        transition-colors duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
        dark:focus:ring-offset-slate-900
        ${isDark ? 'bg-sky-600' : 'bg-slate-300'}
        ${className}
      `}
    >
      {/* Toggle knob with icon */}
      <span
        className={`
          inline-flex items-center justify-center
          h-4 w-4 rounded-full bg-white shadow-sm
          transition-all duration-300 ease-in-out
          ${isDark ? 'translate-x-6' : 'translate-x-1'}
        `}
      >
        {isDark ? (
          <Moon size={10} className="text-sky-600" />
        ) : (
          <Sun size={10} className="text-amber-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
