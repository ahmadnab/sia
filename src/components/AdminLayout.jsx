import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Bot, FolderKanban, MessageSquare, Menu, X, Megaphone, GraduationCap } from 'lucide-react';
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50">
      {/* Logo & Theme Toggle */}
      <div className="p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Bot className="text-white relative z-10" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Sia Admin</h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-indigo-500 dark:text-indigo-400">Dashboard</p>
          </div>
        </Link>
        <ThemeToggle variant="icon" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Shiny hover effect for active items */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    )}
                    <item.icon size={20} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-medium relative z-10">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-sm animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
        <Link
          to="/student"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 group"
        >
          <GraduationCap size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-sm">Switch to Student</span>
        </Link>
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
            CC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Course Coord.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">admin@sia.edu</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/20 via-slate-50 to-slate-100 dark:from-indigo-900/20 dark:via-slate-950 dark:to-slate-950 transition-colors duration-300">

      {/* Mobile Header */}
      <header className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Bot className="text-white" size={18} />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">Sia Admin</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </header>

      <div className="flex h-screen overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:relative top-0 left-0 h-full z-50
            w-72 md:w-72 shrink-0
            transform transition-transform duration-300 ease-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            shadow-2xl md:shadow-none
          `}
        >
          {isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden z-50"
            >
              <X size={20} />
            </button>
          )}
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-auto scroll-smooth">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
