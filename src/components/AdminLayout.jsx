import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Bot, FolderKanban } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const AdminLayout = ({ children }) => {
  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/cohorts', icon: FolderKanban, label: 'Cohorts' },
    { to: '/admin/roster', icon: Users, label: 'Students' },
    { to: '/admin/surveys', icon: ClipboardList, label: 'Surveys' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
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

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
