import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Bot, FolderKanban, MessageSquare, Menu, X, Megaphone } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/cohorts', icon: FolderKanban, label: 'Cohorts' },
    { to: '/admin/roster', icon: Users, label: 'Students' },
    { to: '/admin/surveys', icon: ClipboardList, label: 'Surveys' },
    { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
    { to: '/admin/student-chats', icon: MessageSquare, label: 'Student Chats' },
    { to: '/admin/anonymous-wall', icon: Bot, label: 'Anonymous Wall' },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Sia</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Admin</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <Menu size={24} className="text-slate-600 dark:text-slate-400" />
        </button>
      </header>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:sticky top-0 left-0 h-screen z-50 md:z-auto
            w-72 md:w-64 bg-white dark:bg-slate-800
            border-r border-slate-200 dark:border-slate-700
            flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          aria-label="Admin sidebar"
        >
          {/* Logo - Desktop */}
          <div className="hidden md:block p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <Bot className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-slate-100">Sia</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Admin Dashboard</p>
              </div>
            </div>
          </div>

          {/* Mobile Header in Sidebar */}
          <div className="md:hidden p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <Bot className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-slate-100">Sia</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Admin Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 -mr-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close navigation menu"
            >
              <X size={24} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto" aria-label="Admin navigation">
            <ul className="space-y-1" role="list">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Course Coordinator</p>
            </div>
            <ThemeToggle className="w-full" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
