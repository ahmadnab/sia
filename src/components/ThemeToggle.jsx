import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme, resolvedTheme } = useTheme();

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor size={18} />;
    }
    return resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />;
  };

  const getLabel = () => {
    if (theme === 'system') {
      return 'System theme';
    }
    return resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Ensure toggleTheme is called
    if (toggleTheme) {
      toggleTheme();
    }
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        bg-slate-100 dark:bg-slate-800
        text-slate-700 dark:text-slate-300
        border border-slate-200 dark:border-slate-700
        hover:bg-slate-200 dark:hover:bg-slate-700
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
        cursor-pointer
        ${className}
      `}
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
      <span className="text-sm font-medium hidden sm:inline">
        {theme === 'system' ? 'System' : resolvedTheme === 'dark' ? 'Light' : 'Dark'}
      </span>
    </button>
  );
};

export default ThemeToggle;
