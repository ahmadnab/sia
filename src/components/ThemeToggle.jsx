import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '', variant = 'switch' }) => {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        type="button"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`
          flex items-center justify-center p-2 rounded-lg 
          bg-slate-100 dark:bg-slate-800 
          text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 
          transition-all duration-300 hover:scale-110 active:scale-95
          ${className}
        `}
      >
        {isDark ? (
          <Sun size={20} className="animate-[spin_1s_ease-out_1]" />
        ) : (
          <Moon size={20} className="animate-[bounce_1s_ease-out_1]" />
        )}
      </button>
    );
  }

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
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        dark:focus:ring-offset-slate-900
        ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}
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
          <Moon size={10} className="text-indigo-600" />
        ) : (
          <Sun size={10} className="text-amber-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
